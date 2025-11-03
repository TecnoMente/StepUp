// POST /api/generate/ats-terms - Extract ATS terms from job description
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { getLLMClient } from '@/lib/llm/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, jobDescription, companyName, position } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!jobDescription) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    // Extract ATS terms using Claude
    const llmClient = getLLMClient();
    const atsTerms = await llmClient.extractKeyTerms(jobDescription);

    // Update session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        jdText: jobDescription,
        terms: JSON.stringify(atsTerms),
        companyName: companyName || null,
        position: position || null,
      },
    });

    return NextResponse.json({
      ats_terms: atsTerms,
    });
  } catch (error) {
    console.error('ATS term extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract ATS terms' },
      { status: 500 }
    );
  }
}
