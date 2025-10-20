// GET /api/download/cover-letter?sessionId=... - Download cover letter as HTML
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { generateCoverLetterHTML } from '@/lib/utils/pdf-gen';
import type { TailoredCoverLetter } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get session data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.letterJson) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    const letter = JSON.parse(session.letterJson) as TailoredCoverLetter;
    const html = generateCoverLetterHTML(letter, 'Tailored Cover Letter');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="cover-letter.html"',
      },
    });
  } catch (error) {
    console.error('Cover letter download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
