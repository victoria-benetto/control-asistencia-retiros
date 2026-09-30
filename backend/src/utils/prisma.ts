import { PrismaClient } from '@prisma/client';

declare global {
  var prismaSingleton: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaSingleton ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaSingleton = prisma;
}
