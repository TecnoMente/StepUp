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

    // Get resume data to extract name
    let resumeName = 'CoverLetter';
    if (session.resumeJson) {
      try {
        const resume = JSON.parse(session.resumeJson);
        if (resume.name) {
          const nameParts = resume.name.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          const companyName = session.companyName || 'Company';

          // Remove non-alphanumeric characters from each part
          const safeFirstName = firstName.replace(/[^a-zA-Z0-9]/g, '');
          const safeLastName = lastName.replace(/[^a-zA-Z0-9]/g, '');
          const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '');

          resumeName = `${safeFirstName}${safeLastName}${safeCompanyName}_CoverLetter`;
        }
      } catch (e) {
        console.error('Failed to parse resume name:', e);
      }
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resumeName}.pdf"`,
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
