// POST /api/generate/resume - Generate tailored resume
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';
import { validateTailoredResume, recalculateMatchedTerms, tryRepairEvidenceSpans } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
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

    // Recalculate matched term count
    const actualMatchedCount = recalculateMatchedTerms(tailoredResume);
    tailoredResume.matched_term_count = actualMatchedCount;

    // Save to session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        resumeJson: JSON.stringify(tailoredResume),
        extraText: extraText || session.extraText,
        atsScore: actualMatchedCount,
      },
    });

    return NextResponse.json(tailoredResume);
  } catch (error) {
    console.error('Resume generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tailored resume' },
      { status: 500 }
    );
  }
}
