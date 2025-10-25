// GET /api/download/resume?sessionId=... - Download resume as PDF
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { generateResumePDF } from '@/lib/utils/pdf-generator';
import type { TailoredResume } from '@/lib/types';

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

    if (!session || !session.resumeJson) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resume = JSON.parse(session.resumeJson) as TailoredResume;

    // Parse PDF options if available (to ensure one-page constraint)
    let pdfOptions = {};
    if (session.resumePdfOptions) {
      try {
        pdfOptions = JSON.parse(session.resumePdfOptions);
      } catch (e) {
        console.error('Failed to parse PDF options:', e);
      }
    }

    // Generate PDF buffer using saved options
    const pdfBuffer = await generateResumePDF(resume, pdfOptions);

    // Create a safe filename from the user's name
    const safeFileName = resume.name.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName}_Resume.pdf"`,
      },
    });
  } catch (error) {
    console.error('Resume download error:', error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}
