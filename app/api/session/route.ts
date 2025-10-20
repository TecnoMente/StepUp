// POST /api/session - Create a new session
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';

export async function POST() {
  try {
    const session = await prisma.session.create({
      data: {},
    });

    return NextResponse.json({
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
