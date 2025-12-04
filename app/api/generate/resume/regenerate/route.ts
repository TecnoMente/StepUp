// POST /api/generate/resume/regenerate - Regenerate resume with user suggestions
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';
import { validateTailoredResume, recalculateMatchedTerms, tryRepairEvidenceSpans } from '@/lib/utils/validation';
import type { TailoredResume } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, suggestions } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!suggestions || !suggestions.trim()) {
      return NextResponse.json({ error: 'suggestions are required' }, { status: 400 });
    }

    // Get session data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.jdText || !session.resumeText || !session.resumeJson) {
      return NextResponse.json(
        { error: 'Job description, resume, and existing resume JSON are required' },
        { status: 400 }
      );
    }

    const atsTerms = JSON.parse(session.terms || '[]') as string[];
    const currentResume = JSON.parse(session.resumeJson) as TailoredResume;

    // Generate regenerated resume using Claude with user suggestions
    const llmClient = getLLMClient();
    const regeneratedResume = await llmClient.regenerateTailoredResume({
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
      terms: atsTerms,
      currentResume,
      suggestions: suggestions.trim(),
      forceOnePage: true,
    });

    // Attempt to repair evidence spans
    tryRepairEvidenceSpans(regeneratedResume, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
    });

    // Recalculate matched terms
    regeneratedResume.matched_term_count = recalculateMatchedTerms(regeneratedResume, atsTerms);

    // Validate the regenerated resume
    const validation = validateTailoredResume(regeneratedResume, {
      jd: session.jdText,
      resume: session.resumeText,
      extra: session.extraText || undefined,
    });

    if (!validation.valid) {
      console.error('Regenerated resume validation errors:', validation.errors);
      return NextResponse.json(
        { error: 'Generated resume failed validation', details: validation.errors },
        { status: 500 }
      );
    }

    // Update session with regenerated resume
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        resumeJson: JSON.stringify(regeneratedResume),
        atsScore: regeneratedResume.matched_term_count,
      },
    });

    return NextResponse.json({ resume: regeneratedResume });
  } catch (error) {
    console.error('Resume regeneration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate resume' },
      { status: 500 }
    );
  }
}
