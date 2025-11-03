// GET /api/session/[id] - Get session data
// PATCH /api/session/[id] - Update session data
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { resumeJson, letterJson, companyName, position } = body;

    const updateData: { resumeJson?: string; letterJson?: string; companyName?: string | null; position?: string | null } = {};
    if (resumeJson !== undefined) updateData.resumeJson = resumeJson;
    if (letterJson !== undefined) updateData.letterJson = letterJson;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (position !== undefined) updateData.position = position;

    const session = await prisma.session.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
