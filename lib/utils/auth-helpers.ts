// Helper functions for authentication in API routes
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user from the session
 * Returns the user if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Require authentication for an API route
 * Returns user if authenticated, otherwise returns 401 response
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}
