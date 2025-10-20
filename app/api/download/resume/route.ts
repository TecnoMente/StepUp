// GET /api/download/resume?sessionId=... - Download resume as HTML (print to PDF)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { generateResumeHTML } from '@/lib/utils/pdf-gen';
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
    const html = generateResumeHTML(resume, 'Tailored Resume');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="resume.html"',
      },
    });
  } catch (error) {
    console.error('Resume download error:', error);
    return NextResponse.json({ error: 'Failed to generate resume' }, { status: 500 });
  }
}
