import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';
import type { TailoredCoverLetter } from '@/lib/types';
import { validateTailoredCoverLetter } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, suggestions } = body;

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    if (!suggestions || typeof suggestions !== 'string' || !suggestions.trim()) {
      return NextResponse.json({ error: 'Suggestions are required' }, { status: 400 });
    }

    // Fetch session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validate session has required data
    if (!session.jdText || !session.resumeText || !session.terms || !session.letterJson) {
      return NextResponse.json(
        { error: 'Session missing required data (job description, resume, terms, or current cover letter)' },
        { status: 400 }
      );
    }

    // Parse stored data
    const atsTerms = JSON.parse(session.terms) as string[];
    const currentCoverLetter = JSON.parse(session.letterJson) as TailoredCoverLetter;

    // Generate regenerated cover letter using Claude with user suggestions
    const llmClient = getLLMClient();
    const regeneratedLetter = await llmClient.regenerateTailoredCoverLetter({
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
      terms: atsTerms,
      currentCoverLetter,
      suggestions: suggestions.trim(),
      forceOnePage: true,
    });

    // Validate the regenerated cover letter
    const validationResult = validateTailoredCoverLetter(
      regeneratedLetter,
      {
        resume: session.resumeText,
        jd: session.jdText,
        extra: session.extraText || '',
      }
    );

    if (!validationResult.valid) {
      console.error('Cover letter validation failed:', validationResult.errors);
      return NextResponse.json(
        {
          error: 'Generated cover letter failed validation',
          details: validationResult.errors,
        },
        { status: 500 }
      );
    }

    // Update session with new cover letter
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        letterJson: JSON.stringify(regeneratedLetter),
        atsScore: regeneratedLetter.matched_term_count,
      },
    });

    return NextResponse.json({ letter: regeneratedLetter });
  } catch (error) {
    console.error('Cover letter regeneration error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to regenerate cover letter',
      },
      { status: 500 }
    );
  }
}
