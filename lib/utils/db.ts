// Prisma Client singleton for Next.js
// Prevents multiple instances in development with hot-reload

import { PrismaClient } from '@prisma/client';

// If DATABASE_URL is not configured (e.g., during some CI/export steps),
// provide a lightweight shim to avoid throwing at import time. Routes
// that rely on the DB should handle empty responses accordingly.
const hasDatabase = Boolean(process.env.DATABASE_URL);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaVar: any;

if (!hasDatabase) {
  // Minimal stub that implements the subset of Prisma API our app uses.
  prismaVar = {
    session: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => null,
      update: async () => null,
    },
  };
} else {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  prismaVar =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaVar;
}

export const prisma = prismaVar as PrismaClient;
