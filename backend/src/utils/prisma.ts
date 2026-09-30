import { PrismaClient } from '@prisma/client';

declare global {
  var prismaSingleton: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient | null {
  if (prismaInstance) return prismaInstance;
  if (globalThis.prismaSingleton) {
    prismaInstance = globalThis.prismaSingleton;
    return prismaInstance;
  }
  try {
    prismaInstance = new PrismaClient({
      log: ['error'],
    });
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prismaSingleton = prismaInstance;
    }
    return prismaInstance;
  } catch (err) {
    console.error('⚠️ Error al instanciar PrismaClient:', err);
    return null;
  }
}

// Proxy de seguridad para prevenir colapsos de importación o fallos fatales en Vercel Lambdas
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    if (!client) {
      return new Proxy({}, {
        get() {
          return async () => {
            throw new Error('PrismaClient no se pudo inicializar en el entorno Serverless actual.');
          };
        },
      });
    }
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
