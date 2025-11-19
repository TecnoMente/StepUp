// Session ownership validation
import { prisma } from './db';

/**
 * Verify that a session belongs to the specified user
 * @param sessionId - The session ID to check
 * @param userId - The user ID to verify ownership
 * @returns true if session belongs to user, false otherwise
 */
export async function verifySessionOwnership(sessionId: string, userId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (!session) {
    return false;
  }

  return session.userId === userId;
}

/**
 * Get a session and verify it belongs to the user
 * @param sessionId - The session ID
 * @param userId - The user ID
 * @returns The session if it belongs to the user, null otherwise
 */
export async function getSessionForUser(sessionId: string, userId: string) {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: userId,
    },
  });

  return session;
}
