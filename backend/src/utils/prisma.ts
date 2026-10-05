import { PrismaClient } from '@prisma/client';

declare global {
  var prismaSingleton: PrismaClient | undefined;
}

const SUPABASE_PROJECT_REF = 'taxecszkxqwtnxiglwbu';
const DEFAULT_FULL_URL = `postgresql://postgres.${SUPABASE_PROJECT_REF}:Vulpiare2026!Pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;

export function sanitizeDatabaseUrl(url?: string): string {
  if (!url || url.trim() === '') {
    return DEFAULT_FULL_URL;
  }
  if (url.includes('postgres:') && !url.includes(`postgres.${SUPABASE_PROJECT_REF}:`)) {
    return url.replace('postgres:', `postgres.${SUPABASE_PROJECT_REF}:`);
  }
  return url;
}

function sanitizeDatabaseEnvironment() {
  const dbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  process.env.DATABASE_URL = dbUrl;
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = dbUrl.replace(':6543/', ':5432/').replace('?pgbouncer=true', '');
  }
}

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient | null {
  if (prismaInstance) return prismaInstance;
  if (globalThis.prismaSingleton) {
    prismaInstance = globalThis.prismaSingleton;
    return prismaInstance;
  }
  try {
    sanitizeDatabaseEnvironment();

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
