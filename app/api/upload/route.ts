// POST /api/upload - Upload and parse PDF resume
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { parsePDFToText } from '@/lib/utils/pdf';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const file = formData.get('file') as File;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Parse PDF to text
    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await parsePDFToText(buffer);

    // Update session with parsed text
    await prisma.session.update({
      where: { id: sessionId },
      data: { resumeText },
    });

    // Return preview (first 500 chars)
    const preview = resumeText.substring(0, 500) + (resumeText.length > 500 ? '...' : '');

    return NextResponse.json({
      success: true,
      textPreview: preview,
      length: resumeText.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    );
  }
}
