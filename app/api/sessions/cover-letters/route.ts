// GET /api/sessions/cover-letters - Get all sessions with cover letters
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        letterJson: {
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
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching cover letter sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
