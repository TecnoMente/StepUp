// POST /api/session - Create a new session
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/db';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { requireAuth } from '@/lib/utils/auth-helpers';

// Session expires after 7 days of inactivity (configurable)
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  // Require authentication
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // Apply rate limiting to prevent session spam
  const ip = getClientIp(request);
  const rateLimitResult = rateLimit(ip, RATE_LIMITS.SESSION_CREATION);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many sessions created. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    const session = await prisma.session.create({
      data: {
        expiresAt,
        userId: user!.id, // Link session to authenticated user
      },
    });

    return NextResponse.json({
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
