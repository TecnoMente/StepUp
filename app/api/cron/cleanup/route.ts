// Cron endpoint for automatic session cleanup
// Can be triggered by Vercel Cron Jobs or external services
import { NextRequest, NextResponse } from 'next/server';
import { performCleanup } from '@/lib/utils/cleanup';

export async function GET(request: NextRequest) {
  // Verify the request is authorized (Vercel Cron sends a special header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Optional: Protect with a secret to prevent unauthorized cleanup
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await performCleanup();

    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed',
      ...result,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    );
  }
}
