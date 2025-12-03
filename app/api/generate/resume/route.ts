// POST /api/generate/resume - Generate tailored resume
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import type { Prisma } from '@prisma/client';
import { getLLMClient } from '@/lib/llm/client';
import { validateTailoredResume, recalculateMatchedTerms, tryRepairEvidenceSpans } from '@/lib/utils/validation';
import { generateResumePDF } from '@/lib/utils/pdf-generator';
import pdf from 'pdf-parse';
import type { TailoredResume, ResumeBullet, ResumeSection, ResumeItem } from '@/lib/types';
import type { ResumePDFOptions } from '@/lib/utils/pdf-generator';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/utils/rate-limit';

// Minimal typing for pdf-parse result
interface PDFParseResult {
  numpages?: number;
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = rateLimit(ip, RATE_LIMITS.RESUME_GENERATION);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { sessionId, extraText } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get session data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.jdText || !session.resumeText) {
      return NextResponse.json(
        { error: 'Job description and resume are required' },
        { status: 400 }
      );
    }

    const atsTerms = JSON.parse(session.terms || '[]') as string[];

    // Generate tailored resume using Claude
    const llmClient = getLLMClient();
    const tailoredResume = await llmClient.generateTailoredResume({
      jd: session.jdText,
      resume: session.resumeText,
      extra: extraText || session.extraText || undefined,
      terms: atsTerms,
      forceOnePage: true, // CRITICAL: Request one-page output from the start
    });

    // Attempt to repair evidence spans if the model produced small indexing mistakes
    tryRepairEvidenceSpans(tailoredResume, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: extraText || session.extraText || undefined,
    });

    // Validate evidence spans (anti-hallucination)
    const validationResult = validateTailoredResume(tailoredResume, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: extraText || session.extraText || undefined,
    });

    if (!validationResult.valid) {
      console.error('Validation errors:', validationResult.errors);
      return NextResponse.json(
        {
          error: 'Generated resume failed validation',
          validation_errors: validationResult.errors,
        },
        { status: 422 }
      );
    }

    // Now attempt to render PDF and ensure it fits on one page.
    // We'll allow a few retries where we ask the LLM to aggressively condense if needed.
    let finalResume = tailoredResume as TailoredResume;
    const maxAttempts = 3;
    let lastPageCount = 0;
    let finalPdfOptions: Partial<ResumePDFOptions> = {}; // Track PDF options that successfully fit one page

    const sanitizeForRender = (r: unknown): TailoredResume => {
      try {
        const copy = JSON.parse(JSON.stringify(r)) as TailoredResume;
        if (copy && typeof copy === 'object') delete copy.summary;
        return copy;
      } catch {
        return r as TailoredResume;
      }
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
  const buffer = await generateResumePDF(sanitizeForRender(finalResume));
    // Use pdf-parse to inspect number of pages
    // pdf() returns an object with numpages
    const data = (await pdf(buffer as Buffer)) as PDFParseResult;
    lastPageCount = data.numpages ?? 0;

        if (lastPageCount <= 1) {
          // success
          break;
        }

        // If we still have attempts left, ask the LLM to produce a more condensed resume
        if (attempt < maxAttempts - 1) {
          const hint = `Rendered PDF is ${lastPageCount} pages. Compress to a single page while preserving JD-matching facts.`;
          finalResume = await llmClient.generateTailoredResume({
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
            terms: atsTerms,
            forceOnePage: true,
            hint,
          });

          // Try to repair any evidence spans produced by the condensation attempt
          tryRepairEvidenceSpans(finalResume, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          const validationAfter = validateTailoredResume(finalResume, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          if (!validationAfter.valid) {
            console.error('Validation errors after condensation:', validationAfter.errors);
            // continue to next attempt (maybe next attempt compresses differently)
            continue;
          }
          // else loop and render again
        }
      } catch (err) {
        console.error('PDF render / page check error:', err);
        // If PDF rendering fails, attempt one more generation with forceOnePage and continue
        if (attempt < maxAttempts - 1) {
          finalResume = await llmClient.generateTailoredResume({
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
            terms: atsTerms,
            forceOnePage: true,
            hint: 'PDF rendering failed; please produce a concise one-page resume',
          });
          tryRepairEvidenceSpans(finalResume, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });
          continue;
        }
      }
    }

    if (lastPageCount > 1) {
      // Deterministic fallback: try smaller font sizes, then programmatic trimming.
      const fontSizes = [9, 8];
      let fitted = false;

      for (const fs of fontSizes) {
        try {
          const opts = { bodyFontSize: fs };
          const buf = await generateResumePDF(sanitizeForRender(finalResume), opts);
          const data = (await pdf(buf as Buffer)) as PDFParseResult;
          if ((data.numpages ?? 0) <= 1) {
            fitted = true;
            lastPageCount = data.numpages ?? 0;
            finalPdfOptions = opts as Partial<ResumePDFOptions>; // Save the options that worked
            break;
          }
        } catch (e) {
          console.error('Font-size render error', fs, e);
        }
      }

      // If still too large, remove least-relevant bullets one-by-one at 8pt until it fits.
      if (!fitted) {
        // Deep clone the resume so we can mutate safely
        const clone = JSON.parse(JSON.stringify(finalResume)) as typeof finalResume;

        type BulletRef = { sectionIdx: number; itemIdx: number; bulletIdx: number; relevance: number };

        const collectBullets = (r: typeof clone) => {
          const refs: BulletRef[] = [];
          r.sections.forEach((section, si) => {
            section.items?.forEach((item, ii) => {
              (item.bullets || []).forEach((b, bi) => {
                const rel = Array.isArray(b.matched_terms) ? b.matched_terms.length : 0;
                refs.push({ sectionIdx: si, itemIdx: ii, bulletIdx: bi, relevance: rel });
              });
            });
          });
          return refs;
        };

        // Sort ascending by relevance
  let refs = collectBullets(clone).sort((a, b) => a.relevance - b.relevance);

        while (refs.length > 0) {
          const toRemove = refs.shift();
          if (!toRemove) break;
          const sec = clone.sections[toRemove.sectionIdx];
          if (!sec) continue;
          const it = sec.items[toRemove.itemIdx];
          if (!it || !it.bullets) continue;

          // Remove the bullet
          it.bullets.splice(toRemove.bulletIdx, 1);

          // Clean up empty bullets arrays
          if (it.bullets.length === 0) delete it.bullets;

          // Repair spans & validate
          tryRepairEvidenceSpans(clone, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          const validationAfterTrim = validateTailoredResume(clone, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          if (!validationAfterTrim.valid) {
            // If validation fails, skip this removal and continue with next least-relevant
            console.error('Validation failed after bullet removal, skipping:', validationAfterTrim.errors);
            refs = refs.filter(r => !(r.sectionIdx === toRemove.sectionIdx && r.itemIdx === toRemove.itemIdx && r.bulletIdx === toRemove.bulletIdx));
            continue;
          }

          // Render at smallest font (8pt)
          try {
            const buf2 = await generateResumePDF(sanitizeForRender(clone), { bodyFontSize: 8 });
            const data2 = (await pdf(buf2 as Buffer)) as PDFParseResult;
            lastPageCount = data2.numpages ?? 0;
            if (lastPageCount <= 1) {
              finalResume = clone;
              fitted = true;
              break;
            }
          } catch (err) {
            console.error('Render after bullet removal error', err);
          }

          // Recollect refs since indices changed; rebuild and sort
          refs = collectBullets(clone).sort((a, b) => a.relevance - b.relevance);
        }
      }

      // Additional aggressive deterministic attempts: reduce name/section font, lineHeight, padding
      if (!fitted) {
        const aggressiveOpts: Partial<ResumePDFOptions> = { bodyFontSize: 8, nameFontSize: 12, sectionTitleSize: 9, pagePadding: '0.125in 0.125in', lineHeight: 1.0 };
        try {
          const bufA = await generateResumePDF(finalResume, aggressiveOpts);
          const dataA = (await pdf(bufA as Buffer)) as PDFParseResult;
          if ((dataA.numpages ?? 0) <= 1) {
            fitted = true;
            lastPageCount = dataA.numpages ?? 0;
            finalPdfOptions = aggressiveOpts; // Save aggressive options
          }
        } catch (err) {
          console.error('Aggressive render error', err);
        }
      }

      // If still not fitted, try combining low-value bullets (merge two least-relevant bullets into one) then render at aggressive settings.
      if (!fitted) {
        const clone3 = JSON.parse(JSON.stringify(finalResume)) as typeof finalResume;

        const collectItemBullets = (r: TailoredResume) => {
          const list: { sectionIdx: number; itemIdx: number; bullets: ResumeBullet[] }[] = [];
          r.sections.forEach((s, si) => {
            (s.items || []).forEach((it, ii) => {
              const bs: ResumeBullet[] = (it.bullets || []) as ResumeBullet[];
              if (bs.length >= 2) list.push({ sectionIdx: si, itemIdx: ii, bullets: bs });
            });
          });
          return list;
        };

        let madeChange = true;
        while (!fitted && madeChange) {
          madeChange = false;
          const candidates = collectItemBullets(clone3).map(c => ({ ...c, leastRelevance: c.bullets.reduce((acc, b: ResumeBullet) => acc + (Array.isArray(b.matched_terms) ? b.matched_terms.length : 0), 0) }));
          // sort by least total relevance
          candidates.sort((a, b) => a.leastRelevance - b.leastRelevance);
          if (candidates.length === 0) break;

          const target = candidates[0];
          const sec = clone3.sections[target.sectionIdx];
          const it = sec.items[target.itemIdx];
          if (!it || !it.bullets || it.bullets.length < 2) break;

          // find two least-relevant bullets and merge them
          const bulletsWithRel = it.bullets.map((b: ResumeBullet, idx: number) => ({ idx, rel: Array.isArray(b.matched_terms) ? b.matched_terms.length : 0 }));
          bulletsWithRel.sort((a, b) => a.rel - b.rel);
          const first = bulletsWithRel[0].idx;
          const second = bulletsWithRel[1].idx > first ? bulletsWithRel[1].idx : bulletsWithRel[1].idx;
          const b1 = it.bullets[first];
          const b2 = it.bullets[second];
          const mergedText = ((b1.text || '') + '; ' + (b2.text || '')).trim();
          const mergedMatched = Array.from(new Set([...(b1.matched_terms || []), ...(b2.matched_terms || [])]));
          const mergedBullet = { text: mergedText, evidence_spans: [...(b1.evidence_spans || []), ...(b2.evidence_spans || [])], matched_terms: mergedMatched };

          // remove higher index first
          if (second > first) {
            it.bullets.splice(second, 1);
            it.bullets.splice(first, 1);
          } else {
            it.bullets.splice(first, 1);
            it.bullets.splice(second, 1);
          }
          // insert merged at position 'first'
          it.bullets.splice(first, 0, mergedBullet);
          madeChange = true;

          // Repair and validate
          tryRepairEvidenceSpans(clone3, { jd: session.jdText, resume: session.resumeText, extra: extraText || session.extraText || undefined });
          const val = validateTailoredResume(clone3, { jd: session.jdText, resume: session.resumeText, extra: extraText || session.extraText || undefined });
          if (!val.valid) {
            console.error('Validation failed after merging bullets, skipping merge', val.errors);
            // revert change (drop merged and restore original two)
            // For simplicity, don't revert; continue to next candidate
          }

          // render
          try {
            const mergeOpts = { bodyFontSize: 8, nameFontSize: 12, sectionTitleSize: 9, pagePadding: '0.125in 0.125in', lineHeight: 1.0 };
            const buf5 = await generateResumePDF(clone3, mergeOpts);
            const data5 = (await pdf(buf5 as Buffer)) as PDFParseResult;
            lastPageCount = data5.numpages ?? 0;
            if (lastPageCount <= 1) {
              finalResume = clone3;
              fitted = true;
              finalPdfOptions = mergeOpts; // Save options from bullet merging
              break;
            }
          } catch (err) {
            console.error('Render after merging bullets error', err);
          }
        }
      }

      // If still not fitted, try removing low-value whole sections (non-Experience first)
      if (!fitted) {
        const clone2 = JSON.parse(JSON.stringify(finalResume)) as typeof finalResume;
        // Score sections by total matched terms
        const sectionScore = (s: ResumeSection) => {
          let score = 0;
          (s.items || []).forEach((it: ResumeItem) => {
            (it.bullets || []).forEach((b: ResumeBullet) => {
              score += (Array.isArray(b.matched_terms) ? b.matched_terms.length : 0);
            });
          });
          return score;
        };

        // Build list of removable section indices, prefer non-Experience
        const secIdxs = clone2.sections.map((s: ResumeSection, idx: number) => ({ idx, name: s.name, score: sectionScore(s) }));
        // Sort by score ascending and deprioritize 'Experience' and 'Education'
        secIdxs.sort((a, b) => {
          const aPriority = a.name === 'Experience' || a.name === 'Education' ? 1 : 0;
          const bPriority = b.name === 'Experience' || b.name === 'Education' ? 1 : 0;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.score - b.score;
        });

        for (const s of secIdxs) {
          // skip if it's Experience and there are other sections to remove first
          if (s.name === 'Experience' && secIdxs.some(x => x.name !== 'Experience' && x.idx !== s.idx)) continue;

          // remove the section
          clone2.sections.splice(s.idx, 1);

          tryRepairEvidenceSpans(clone2, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          const validationAfterSectionTrim = validateTailoredResume(clone2, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: extraText || session.extraText || undefined,
          });

          if (!validationAfterSectionTrim.valid) {
            console.error('Validation failed after section removal, skipping:', validationAfterSectionTrim.errors);
            continue;
          }

          try {
            const buf3 = await generateResumePDF(sanitizeForRender(clone2), { bodyFontSize: 8 });
            const data3 = (await pdf(buf3 as Buffer)) as PDFParseResult;
            lastPageCount = data3.numpages ?? 0;
            if (lastPageCount <= 1) {
              finalResume = clone2;
              fitted = true;
              break;
            }
          } catch (err) {
            console.error('Render after section removal error', err);
          }
        }
      }

      // Last-ditch: reduce page padding and render at 8pt
      if (!fitted) {
        try {
          const finalOpts = { bodyFontSize: 8, pagePadding: '0.25in 0.25in' };
          const buf4 = await generateResumePDF(sanitizeForRender(finalResume), finalOpts);
          const data4 = (await pdf(buf4 as Buffer)) as PDFParseResult;
          lastPageCount = data4.numpages ?? 0;
          if (lastPageCount <= 1) {
            fitted = true;
            finalPdfOptions = finalOpts; // Save final fallback options
          }
        } catch (err) {
          console.error('Final fallback render error', err);
        }
      }

      // If still not fitted: deterministic programmatic compressor (guarantee fit)
      if (!fitted) {
        // This implements several deterministic steps that progressively reduce
        // length and complexity until the resume fits a single page. We prefer
        // programmatic changes over asking the LLM again to avoid nondeterminism.
        const baseOpts: Partial<ResumePDFOptions> = { bodyFontSize: 8, nameFontSize: 12, sectionTitleSize: 9, pagePadding: '0.125in 0.125in', lineHeight: 1.0 };

        const tryRender = async (r: TailoredResume, opts: Partial<ResumePDFOptions>) => {
          try {
            const buf = await generateResumePDF(sanitizeForRender(r), opts);
            const data = (await pdf(buf as Buffer)) as PDFParseResult;
            return (data.numpages ?? 0);
          } catch (e) {
            console.error('Deterministic render error', e);
            return Number.MAX_SAFE_INTEGER;
          }
        };

        // Deep clone function
        const cloneResume = (r: TailoredResume) => JSON.parse(JSON.stringify(r)) as TailoredResume;

        // Helpers: truncate text and limit bullets per item
        const truncate = (s: string, max: number) => (s && s.length > max ? s.slice(0, max).trim() + '…' : s);

        // Strategy sequence: 1) limit bullets/item to 3, 2) limit bullets to 2, 3) truncate bullets progressively,
        // 4) merge bullets per item into one, 5) keep only top 3 sections by matched term score, 6) final extreme truncation

        // Define strategy types
        type Strategy = {
          name: string;
          maxBullets?: number;
          maxChar?: number | null;
          merge?: boolean;
          keepSections?: number;
          pagePadding?: string;
          nameFontSize?: number;
          sectionTitleSize?: number;
        };

        const strategies: Strategy[] = [
          { name: 'limit-3', maxBullets: 3, maxChar: null },
          { name: 'limit-2', maxBullets: 2, maxChar: null },
          { name: 'truncate-120', maxBullets: 2, maxChar: 120 },
          { name: 'truncate-100', maxBullets: 2, maxChar: 100 },
          { name: 'truncate-80', maxBullets: 2, maxChar: 80 },
          { name: 'merge-bullets', merge: true, maxChar: 400 },
          { name: 'top-3-sections', keepSections: 3, maxChar: 80 },
          { name: 'final-extreme', keepSections: 2, maxChar: 60, pagePadding: '0.08in 0.08in', nameFontSize: 11, sectionTitleSize: 8 },
        ];

        for (const strat of strategies) {
          const candidate = cloneResume(finalResume);

          // Remove or limit bullets
          for (const sec of candidate.sections) {
            for (const it of sec.items || []) {
              if (Array.isArray(it.bullets) && it.bullets.length > 0) {
                if (strat.merge) {
                  // merge all bullets into one combined bullet per item
                  const texts = (it.bullets || []).map(b => (b.text || '').trim()).filter(Boolean);
                  const merged = texts.join('; ');
                  it.bullets = [{ text: truncate(merged, strat.maxChar ?? 400), evidence_spans: [], matched_terms: [] } as ResumeBullet];
                } else {
                  const maxB = strat.maxBullets ?? it.bullets.length;
                  it.bullets = (it.bullets || []).slice(0, maxB);
                  if (strat.maxChar) {
                    it.bullets = it.bullets.map((b: ResumeBullet) => ({ ...b, text: truncate(b.text || '', strat.maxChar as number) }));
                  }
                }
              }
            }
          }

          // Keep only top N sections by matched-term score if requested
          if (strat.keepSections) {
            const scores = candidate.sections.map((s, idx) => {
              let score = 0;
              for (const it of s.items || []) {
                for (const b of it.bullets || []) {
                  score += (Array.isArray(b.matched_terms) ? b.matched_terms.length : 0);
                }
              }
              return { idx, score, name: s.name };
            });
            scores.sort((a, b) => b.score - a.score);
            const keep = new Set(scores.slice(0, strat.keepSections).map(s => s.idx));
            candidate.sections = candidate.sections.filter((_, idx) => keep.has(idx));
          }

          // Apply candidate truncation and aggressive opts
          const opts: Partial<ResumePDFOptions> = { ...baseOpts };
          if (strat.pagePadding) opts.pagePadding = strat.pagePadding;
          if (strat.nameFontSize) opts.nameFontSize = strat.nameFontSize;
          if (strat.sectionTitleSize) opts.sectionTitleSize = strat.sectionTitleSize;

          const pages = await tryRender(candidate, opts);
          if (pages <= 1) {
            finalResume = candidate;
            fitted = true;
            finalPdfOptions = opts;
            lastPageCount = pages;
            break;
          }
          // otherwise continue to next strategy
        }

        // If still not fitted, as an unsurprising final step, do extreme truncation: keep only Experience with top 5 bullets total
        if (!fitted) {
          const finalCandidate = cloneResume(finalResume);
          // keep only Experience (or first section) and top 5 bullets across it
          const expIdx = finalCandidate.sections.findIndex(s => /experience/i.test(s.name));
          if (expIdx >= 0) {
            const exp = finalCandidate.sections[expIdx];
            const allBullets: ResumeBullet[] = [];
            for (const it of exp.items || []) {
              for (const b of it.bullets || []) allBullets.push(b);
            }
            // keep top 5 by matched_terms length
            allBullets.sort((a, b) => (b.matched_terms?.length || 0) - (a.matched_terms?.length || 0));
            const keep = allBullets.slice(0, 5);
            exp.items = [{ title: exp.items?.[0]?.title ?? '', organization: exp.items?.[0]?.organization ?? '', bullets: keep }];
            finalCandidate.sections = [exp];
          } else {
            // fallback: keep first section only and first 5 bullets across items
            const s = finalCandidate.sections[0];
            const all = (s.items || []).flatMap(it => it.bullets || []);
            const keep = all.slice(0, 5);
            s.items = [{ title: s.items?.[0]?.title ?? '', organization: s.items?.[0]?.organization ?? '', bullets: keep }];
            finalCandidate.sections = [s];
          }

          const extremeOpts: Partial<ResumePDFOptions> = { bodyFontSize: 8, nameFontSize: 11, sectionTitleSize: 8, pagePadding: '0.08in 0.08in', lineHeight: 1.0 };
          const pagesFinal = await tryRender(finalCandidate, extremeOpts);
          if (pagesFinal <= 1) {
            finalResume = finalCandidate;
            finalPdfOptions = extremeOpts;
            fitted = true;
            lastPageCount = pagesFinal;
          }
        }
      }

      if (!fitted && lastPageCount > 1) {
        // Final forced minimal resume: create a very small, information-dense one-page
        // resume (Experience-first, max 5 bullets) and render with extreme layout options.
        try {
          const minimal = ((): TailoredResume => {
            const src = finalResume.sections && finalResume.sections.length > 0 ? finalResume : tailoredResume as TailoredResume;
            // pick Experience if present, otherwise first section
            const expIdx = src.sections.findIndex(s => /experience/i.test(s.name));
            const section = expIdx >= 0 ? src.sections[expIdx] : src.sections[0];
            // collect top bullets by matched_terms across the section
            const allBullets: ResumeBullet[] = [];
            for (const it of section.items || []) {
              for (const b of it.bullets || []) allBullets.push(b);
            }
            allBullets.sort((a, b) => (b.matched_terms?.length || 0) - (a.matched_terms?.length || 0));
            const keep = allBullets.slice(0, 5).map(b => ({ ...b, text: (b.text || '').slice(0, 80) }));

            const minimalSection = { name: section.name, items: [{ title: section.items?.[0]?.title ?? '', organization: section.items?.[0]?.organization ?? '', bullets: keep }] };

            // minimal resume object
            return {
              name: (finalResume.name || tailoredResume.name || '').split(' ').slice(0,2).join(' '),
              email: undefined,
              phone: undefined,
              location: undefined,
              linkedin: undefined,
              github: undefined,
              sections: [minimalSection],
              matched_term_count: recalculateMatchedTerms({ ...finalResume, sections: [minimalSection] } as TailoredResume, atsTerms),
            } as TailoredResume;
          })();

          const extremeOpts: Partial<ResumePDFOptions> = { bodyFontSize: 8, nameFontSize: 10, sectionTitleSize: 8, pagePadding: '0.04in 0.04in', lineHeight: 1.0 };
          const bufMin = await generateResumePDF(sanitizeForRender(minimal), extremeOpts);
          const pagesMin = (await pdf(bufMin as Buffer)) as PDFParseResult;
          const numMin = pagesMin.numpages ?? 0;
          if (numMin <= 1) {
            finalResume = minimal;
            finalPdfOptions = extremeOpts;
            fitted = true;
            lastPageCount = numMin;
          } else {
            console.warn('Final forced minimal resume still >1 page, returning best-effort result');
          }
        } catch (err) {
          console.error('Error generating final minimal resume fallback', err);
        }
      }
    }

    // Ensure we follow UMich format: do not include a top summary in the saved/rendered resume
    try {
      if (finalResume && typeof finalResume === 'object') {
        delete (finalResume as Partial<TailoredResume>).summary;
      }
    } catch {
      // ignore
    }

    // Recalculate matched term count and save finalResume
    const actualMatchedCount = recalculateMatchedTerms(finalResume, atsTerms);
    finalResume.matched_term_count = actualMatchedCount;

    await prisma.session.update({
      where: { id: sessionId },
      // Use generated Prisma type for update payload to avoid 'any'
      data: {
        resumeJson: JSON.stringify(finalResume),
        extraText: extraText || session.extraText,
        atsScore: actualMatchedCount,
        resumePdfOptions: JSON.stringify(finalPdfOptions), // Save PDF options for consistent rendering
      } as Prisma.SessionUpdateInput,
    });

    return NextResponse.json(finalResume);
  } catch (error) {
    console.error('Resume generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tailored resume' },
      { status: 500 }
    );
  }
}
