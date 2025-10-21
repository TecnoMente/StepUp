// GET /api/download/cover-letter?sessionId=... - Download cover letter as PDF
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { generateCoverLetterPDF } from '@/lib/utils/pdf-generator';
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

    // Generate PDF buffer
    const pdfBuffer = await generateCoverLetterPDF(letter);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Cover_Letter.pdf"',
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
