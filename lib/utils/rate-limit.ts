// Simple in-memory rate limiter
// For production, consider using Redis or Vercel KV for distributed rate limiting

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter using token bucket algorithm
 * @param identifier - Unique identifier (e.g., IP address, session ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Get or create entry
  if (!store[identifier] || store[identifier].resetAt < now) {
    store[identifier] = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  const entry = store[identifier];

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Get client IP address from request
 * Works with Vercel's forwarded headers
 */
export function getClientIp(request: Request): string {
  // Vercel provides the real IP in x-forwarded-for header
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Generous limit for resume generation (compute-intensive)
  RESUME_GENERATION: {
    limit: 10, // 10 requests
    windowSeconds: 60 * 60, // per hour
  },
  // More restrictive for cover letter generation
  COVER_LETTER_GENERATION: {
    limit: 20, // 20 requests
    windowSeconds: 60 * 60, // per hour
  },
  // General API endpoints
  API_DEFAULT: {
    limit: 100, // 100 requests
    windowSeconds: 60 * 15, // per 15 minutes
  },
  // Session creation (prevent abuse)
  SESSION_CREATION: {
    limit: 5, // 5 sessions
    windowSeconds: 60 * 60, // per hour
  },
};
