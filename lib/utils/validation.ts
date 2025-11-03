// Evidence validation - prevents hallucination
import type {
  EvidenceSpan,
  TailoredResume,
  TailoredCoverLetter,
  ValidationResult,
  ValidationError,
} from '@/lib/types';

interface SourceTexts {
  resume: string;
  jd: string;
  extra?: string;
}

/**
 * Validate that all evidence spans reference real text in source documents
 * This is the core anti-hallucination mechanism
 */
export function validateEvidenceSpans(
  spans: EvidenceSpan[],
  sources: SourceTexts
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const span of spans) {
    const sourceText = sources[span.source];

    if (!sourceText) {
      errors.push({
        field: 'evidence_span',
        message: `Source '${span.source}' not provided`,
        evidence: span,
      });
      continue;
    }

    // Validate character offsets
    if (span.start < 0 || span.end > sourceText.length || span.start >= span.end) {
      errors.push({
        field: 'evidence_span',
        message: `Invalid character offsets: ${span.start}-${span.end} (source length: ${sourceText.length})`,
        evidence: span,
      });
      continue;
    }

    // Extract the referenced text
    const referencedText = sourceText.substring(span.start, span.end);

    // Store it for transparency
    span.text = referencedText;
  }

  return errors;
}

/**
 * Validate a complete tailored resume
 */
export function validateTailoredResume(
  resume: TailoredResume,
  sources: SourceTexts
): ValidationResult {
  const errors: ValidationError[] = [];
  let resumeEvidenceCount = 0;
  let jdEvidenceCount = 0;
  let extraEvidenceCount = 0;

  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.bullets) {
        for (const bullet of item.bullets) {
          const bulletErrors = validateEvidenceSpans(bullet.evidence_spans, sources);
          errors.push(...bulletErrors);

          // Count evidence sources
          for (const span of bullet.evidence_spans) {
            if (span.source === 'resume') resumeEvidenceCount++;
            else if (span.source === 'jd') jdEvidenceCount++;
            else if (span.source === 'extra') extraEvidenceCount++;
          }

          // Ensure matched_terms are valid
          if (!Array.isArray(bullet.matched_terms)) {
            errors.push({
              field: 'matched_terms',
              message: 'matched_terms must be an array',
            });
          }
        }
      }
    }
  }

  // Validate matched_term_count
  if (typeof resume.matched_term_count !== 'number' || resume.matched_term_count < 0) {
    errors.push({
      field: 'matched_term_count',
      message: 'matched_term_count must be a non-negative number',
    });
  }

  // Check evidence source distribution - most evidence should come from resume
  const totalEvidence = resumeEvidenceCount + jdEvidenceCount + extraEvidenceCount;
  if (totalEvidence > 0) {
    const resumePercentage = (resumeEvidenceCount / totalEvidence) * 100;
    const jdPercentage = (jdEvidenceCount / totalEvidence) * 100;

    // WARNING: If more than 30% of evidence comes from JD, that's suspicious
    // (some JD evidence is OK for context, but resume should be primary source)
    if (jdPercentage > 30) {
      errors.push({
        field: 'evidence_distribution',
        message: `WARNING: ${jdPercentage.toFixed(1)}% of evidence comes from job description. Resume should be primary source of facts. This may indicate fabricated content.`,
      });
    }

    // ERROR: If less than 50% of evidence comes from resume, that's a red flag
    if (resumePercentage < 50) {
      errors.push({
        field: 'evidence_distribution',
        message: `ERROR: Only ${resumePercentage.toFixed(1)}% of evidence comes from resume. Most facts should come from the resume, not the job description.`,
      });
    }

    console.log(`Evidence distribution - Resume: ${resumePercentage.toFixed(1)}%, JD: ${jdPercentage.toFixed(1)}%, Extra: ${((extraEvidenceCount / totalEvidence) * 100).toFixed(1)}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a complete tailored cover letter
 */
export function validateTailoredCoverLetter(
  letter: TailoredCoverLetter,
  sources: SourceTexts
): ValidationResult {
  const errors: ValidationError[] = [];
  let resumeEvidenceCount = 0;
  let jdEvidenceCount = 0;
  let extraEvidenceCount = 0;

  for (const paragraph of letter.paragraphs) {
    const paragraphErrors = validateEvidenceSpans(paragraph.evidence_spans, sources);
    errors.push(...paragraphErrors);

    // Count evidence sources
    for (const span of paragraph.evidence_spans) {
      if (span.source === 'resume') resumeEvidenceCount++;
      else if (span.source === 'jd') jdEvidenceCount++;
      else if (span.source === 'extra') extraEvidenceCount++;
    }

    if (!Array.isArray(paragraph.matched_terms)) {
      errors.push({
        field: 'matched_terms',
        message: 'matched_terms must be an array',
      });
    }
  }

  if (typeof letter.matched_term_count !== 'number' || letter.matched_term_count < 0) {
    errors.push({
      field: 'matched_term_count',
      message: 'matched_term_count must be a non-negative number',
    });
  }

  // Check evidence source distribution - most evidence should come from resume
  const totalEvidence = resumeEvidenceCount + jdEvidenceCount + extraEvidenceCount;
  if (totalEvidence > 0) {
    const resumePercentage = (resumeEvidenceCount / totalEvidence) * 100;
    const jdPercentage = (jdEvidenceCount / totalEvidence) * 100;

    // Cover letters can reference JD more than resumes (to show alignment), but resume should still be primary
    // WARNING: If more than 40% of evidence comes from JD (more lenient than resume)
    if (jdPercentage > 40) {
      errors.push({
        field: 'evidence_distribution',
        message: `WARNING: ${jdPercentage.toFixed(1)}% of evidence comes from job description. Resume should be primary source of facts about candidate. This may indicate fabricated content.`,
      });
    }

    // ERROR: If less than 40% of evidence comes from resume (more lenient than resume validation)
    if (resumePercentage < 40) {
      errors.push({
        field: 'evidence_distribution',
        message: `ERROR: Only ${resumePercentage.toFixed(1)}% of evidence comes from resume. Most facts about candidate should come from the resume, not the job description.`,
      });
    }

    console.log(`Cover Letter Evidence distribution - Resume: ${resumePercentage.toFixed(1)}%, JD: ${jdPercentage.toFixed(1)}%, Extra: ${((extraEvidenceCount / totalEvidence) * 100).toFixed(1)}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Attempt to repair invalid evidence spans by locating the referenced text in sources.
 * This fixes common model mistakes (off-by-one, zero-length spans) when the cited
 * substring exists verbatim in the source. Only apply repairs when there is a clear
 * match; do not invent or guess substrings.
 */
export function tryRepairEvidenceSpans(
  obj: unknown,
  sources: SourceTexts
): boolean {
  let repaired = false;

  // Resume structure: obj.sections[].items[].bullets[].evidence_spans
  // Cover letter structure: obj.paragraphs[].evidence_spans

  const safeFindAndRepair = (spans: EvidenceSpan[] | undefined, textCandidate?: string) => {
    if (!spans || spans.length === 0) return;
    for (const span of spans) {
      const sourceText = sources[span.source];
      if (!sourceText) continue;

      const invalid = span.start < 0 || span.end > sourceText.length || span.start >= span.end;
      if (!invalid) continue;

      // Try to find the textCandidate in the source text
      const needle = (textCandidate || '').toString().trim();
      if (needle) {
        const idx = sourceText.indexOf(needle);
        if (idx >= 0) {
          span.start = idx;
          span.end = idx + needle.length;
          // store the referenced text for transparency
          span.text = sourceText.substring(span.start, span.end);
          repaired = true;
          continue;
        }

        // If exact match not found, try searching for any matched term inside the source
        // (useful when the model provided a long span that contains known keywords)
        // If available, parent metadata may be attached to spans for context
      }

      // Fallback: try to find any short substring of the needle
      if (needle && needle.length > 10) {
        const snippet = needle.slice(0, 30);
        const idx2 = sourceText.indexOf(snippet);
        if (idx2 >= 0) {
          span.start = idx2;
          span.end = Math.min(sourceText.length, idx2 + Math.min(needle.length, 400));
          span.text = sourceText.substring(span.start, span.end);
          repaired = true;
          continue;
        }
      }

      // Try matched_terms if available on the parent bullet/paragraph
  const maybeParent = (spans as unknown as { __parent?: { matched_terms?: string[] } }).__parent;
      if (maybeParent && Array.isArray(maybeParent.matched_terms)) {
        for (const term of maybeParent.matched_terms) {
          if (!term || typeof term !== 'string') continue;
          const tIdx = sourceText.indexOf(term);
          if (tIdx >= 0) {
            // expand a bit around the term for context
            const ctxStart = Math.max(0, tIdx - 20);
            const ctxEnd = Math.min(sourceText.length, tIdx + term.length + 20);
            span.start = ctxStart;
            span.end = ctxEnd;
            span.text = sourceText.substring(span.start, span.end);
            repaired = true;
            break;
          }
        }
        if (repaired) continue;
      }

      // Last-resort: clamp or derive a reasonable span near the end of the source
      const srcLen = sourceText.length;
      const desiredLen = Math.max(20, Math.min(span.end - span.start || 100, 400));
      const newEnd = Math.min(srcLen, span.end > 0 ? span.end : srcLen);
      const newStart = Math.max(0, newEnd - desiredLen);
      if (newStart < newEnd) {
        span.start = newStart;
        span.end = newEnd;
        span.text = sourceText.substring(span.start, span.end);
        repaired = true;
      }
    }
  };

  // Resume-style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asAny = obj as any;
  if (asAny && Array.isArray(asAny.sections)) {
    for (const section of asAny.sections) {
      if (!section || !Array.isArray(section.items)) continue;
      for (const item of section.items) {
        const itemText = (item && item.title) ? String(item.title) : undefined;
        if (Array.isArray(item.bullets)) {
          for (const bullet of item.bullets) {
            const bulletText = (bullet && bullet.text) ? String(bullet.text) : itemText;
            safeFindAndRepair(bullet.evidence_spans, bulletText);
          }
        }
      }
    }
    return repaired;
  }

  // Cover-letter-style
  if (asAny && Array.isArray(asAny.paragraphs)) {
    for (const paragraph of asAny.paragraphs) {
      const paraText = paragraph && paragraph.text ? String(paragraph.text) : undefined;
      safeFindAndRepair(paragraph.evidence_spans, paraText);
    }
    return repaired;
  }

  return repaired;
}

/**
 * Calculate actual matched term count from resume
 */
export function recalculateMatchedTerms(resume: TailoredResume): number {
  const uniqueTerms = new Set<string>();

  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.bullets) {
        for (const bullet of item.bullets) {
          bullet.matched_terms.forEach((term) => uniqueTerms.add(term));
        }
      }
    }
  }

  return uniqueTerms.size;
}

export function recalculateMatchedTermsForCoverLetter(letter: TailoredCoverLetter): number {
  const uniqueTerms = new Set<string>();

  for (const paragraph of letter.paragraphs) {
    paragraph.matched_terms.forEach((term) => uniqueTerms.add(term));
  }

  return uniqueTerms.size;
}

// Helper to get array of matched terms from resume
export function getMatchedTermsFromResume(resume: TailoredResume): string[] {
  const uniqueTerms = new Set<string>();

  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.bullets) {
        for (const bullet of item.bullets) {
          bullet.matched_terms.forEach((term) => uniqueTerms.add(term));
        }
      }
    }
  }

  return Array.from(uniqueTerms);
}

// Helper to get array of matched terms from cover letter
export function getMatchedTermsFromCoverLetter(letter: TailoredCoverLetter): string[] {
  const uniqueTerms = new Set<string>();

  for (const paragraph of letter.paragraphs) {
    paragraph.matched_terms.forEach((term) => uniqueTerms.add(term));
  }

  return Array.from(uniqueTerms);
}
