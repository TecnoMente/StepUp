// GET /api/sessions/resumes - Get all sessions with resumes
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        resumeJson: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        atsScore: true,
        companyName: true,
        position: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching resume sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
