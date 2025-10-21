// POST /api/generate/cover-letter - Generate tailored cover letter
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';
import { validateTailoredCoverLetter } from '@/lib/utils/validation';

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

    // Validate evidence spans (anti-hallucination)
    const validationResult = validateTailoredCoverLetter(tailoredLetter, {
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

    // Save to session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        letterJson: JSON.stringify(tailoredLetter),
      },
    });

    return NextResponse.json(tailoredLetter);
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
