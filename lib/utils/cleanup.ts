// Automatic cleanup of expired and old sessions
import { prisma } from './db';

/**
 * Deletes all expired sessions from the database
 * Should be run periodically (e.g., via cron job or API endpoint)
 */
export async function cleanupExpiredSessions() {
  const now = new Date();

  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: now, // Less than current time
      },
    },
  });

  console.log(`Cleaned up ${result.count} expired sessions`);
  return result.count;
}

/**
 * Deletes sessions older than the specified number of days
 * This enforces data retention policy for privacy/security
 * @param days - Number of days to retain sessions (default: 30)
 */
export async function cleanupOldSessions(days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.session.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`Cleaned up ${result.count} sessions older than ${days} days`);
  return result.count;
}

/**
 * Combined cleanup: removes both expired and old sessions
 * Recommended to run this periodically (daily via cron)
 */
export async function performCleanup() {
  console.log('Starting session cleanup...');

  const expiredCount = await cleanupExpiredSessions();
  const oldCount = await cleanupOldSessions(30);

  console.log(`Total cleanup: ${expiredCount + oldCount} sessions removed`);

  return {
    expiredSessions: expiredCount,
    oldSessions: oldCount,
    total: expiredCount + oldCount,
  };
}
