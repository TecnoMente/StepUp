// POST /api/generate/cover-letter - Generate tailored cover letter
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';
import { validateTailoredCoverLetter, tryRepairEvidenceSpans, recalculateMatchedTermsForCoverLetter } from '@/lib/utils/validation';
import { generateCoverLetterPDF } from '@/lib/utils/pdf-generator';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

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

    // Generate tailored cover letter using Claude (with retry on failure)
    const llmClient = getLLMClient();
    let tailoredLetter;
    let lastError;

    // Retry up to 2 times on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        tailoredLetter = await llmClient.generateCoverLetter({
          jd: session.jdText,
          resume: session.resumeText,
          extra: session.extraText || undefined,
          terms: atsTerms,
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.error(`Cover letter generation attempt ${attempt + 1} failed:`, error);
        if (attempt < 1) {
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!tailoredLetter) {
      throw lastError || new Error('Failed to generate cover letter after retries');
    }

    // Fix literal \n in closing and salutation fields (convert to actual newlines)
    if (tailoredLetter.closing) {
      tailoredLetter.closing = tailoredLetter.closing.replace(/\\n/g, '\n');
    }
    if (tailoredLetter.salutation) {
      tailoredLetter.salutation = tailoredLetter.salutation.replace(/\\n/g, '\n');
    }

    // Attempt to repair evidence spans if the model produced small indexing mistakes
    tryRepairEvidenceSpans(tailoredLetter, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
    });

    // Validate evidence spans (anti-hallucination)
    let validationResult = validateTailoredCoverLetter(tailoredLetter, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
    });

    if (!validationResult.valid) {
      console.error('Validation errors:', validationResult.errors);
      return NextResponse.json(
        {
          error: 'Generated cover letter failed validation',
          validation_errors: validationResult.errors,
        },
        { status: 422 }
      );
    }

    // Ensure generated cover letter fits on one page by rendering and checking page count.
    let finalLetter = tailoredLetter;
    const maxAttempts = 2;
    let lastPageCount = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const buffer = await generateCoverLetterPDF(finalLetter);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await pdf(buffer as Buffer);
        lastPageCount = data.numpages || 0;
        if (lastPageCount <= 1) break;

        if (attempt < maxAttempts - 1) {
          const hint = `Rendered cover letter is ${lastPageCount} pages. Compress to a single page.`;
          finalLetter = await llmClient.generateCoverLetter({
            jd: session.jdText,
            resume: session.resumeText,
            extra: session.extraText || undefined,
            terms: atsTerms,
            forceOnePage: true,
            hint,
          });

          // Fix literal \n in closing and salutation fields
          if (finalLetter.closing) {
            finalLetter.closing = finalLetter.closing.replace(/\\n/g, '\n');
          }
          if (finalLetter.salutation) {
            finalLetter.salutation = finalLetter.salutation.replace(/\\n/g, '\n');
          }

          tryRepairEvidenceSpans(finalLetter, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: session.extraText || undefined,
          });

          validationResult = validateTailoredCoverLetter(finalLetter, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: session.extraText || undefined,
          });

          if (!validationResult.valid) {
            console.error('Validation errors after condensation:', validationResult.errors);
            continue;
          }
        }
      } catch (err) {
        console.error('Cover letter PDF render error:', err);
        if (attempt < maxAttempts - 1) {
          finalLetter = await llmClient.generateCoverLetter({
            jd: session.jdText,
            resume: session.resumeText,
            extra: session.extraText || undefined,
            terms: atsTerms,
            forceOnePage: true,
            hint: 'PDF rendering failed; please produce a concise one-page cover letter',
          });

          // Fix literal \n in closing and salutation fields
          if (finalLetter.closing) {
            finalLetter.closing = finalLetter.closing.replace(/\\n/g, '\n');
          }
          if (finalLetter.salutation) {
            finalLetter.salutation = finalLetter.salutation.replace(/\\n/g, '\n');
          }

          tryRepairEvidenceSpans(finalLetter, {
            jd: session.jdText,
            resume: session.resumeText,
            extra: session.extraText || undefined,
          });
          continue;
        }
      }
    }

    if (lastPageCount > 1) {
      return NextResponse.json(
        { error: 'Could not produce a one-page cover letter after retries', pages: lastPageCount },
        { status: 422 }
      );
    }

    // Recalculate matched term count and save final letter
    const actualMatchedCount = recalculateMatchedTermsForCoverLetter(finalLetter);
    finalLetter.matched_term_count = actualMatchedCount;

    // Save final letter
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        letterJson: JSON.stringify(finalLetter),
        atsScore: actualMatchedCount,
      },
    });

    return NextResponse.json(finalLetter);
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
