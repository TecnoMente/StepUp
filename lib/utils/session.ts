// Session validation utilities
import { prisma } from './db';

/**
 * Validates if a session exists and is not expired
 * @param sessionId - The session ID to validate
 * @returns The session object if valid, null otherwise
 */
export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt && session.expiresAt < new Date()) {
    // Session expired, optionally delete it
    await prisma.session.delete({ where: { id: sessionId } });
    return null;
  }

  return session;
}

/**
 * Extends session expiration by updating the expiresAt timestamp
 * @param sessionId - The session ID to extend
 */
export async function extendSession(sessionId: string) {
  const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt },
  });
}
