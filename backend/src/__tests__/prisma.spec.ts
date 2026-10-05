import { describe, it, expect } from 'vitest';
import { sanitizeDatabaseUrl } from '../utils/prisma';

describe('Prisma DATABASE_URL Sanitizer Tests (Regression for Bug 3db28a3)', () => {
  it('should auto-append tenant identifier to raw pooler URL missing tenant ref', () => {
    const rawUrl = 'postgresql://postgres:Password123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const sanitized = sanitizeDatabaseUrl(rawUrl);
    expect(sanitized).toContain('postgres.taxecszkxqwtnxiglwbu:Password123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres');
  });

  it('should not alter URL if tenant identifier is already present', () => {
    const correctUrl = 'postgresql://postgres.taxecszkxqwtnxiglwbu:Password123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const sanitized = sanitizeDatabaseUrl(correctUrl);
    expect(sanitized).toBe(correctUrl);
  });

  it('should handle undefined or empty URL gracefully with default fallback', () => {
    expect(sanitizeDatabaseUrl('')).toContain('taxecszkxqwtnxiglwbu');
    expect(sanitizeDatabaseUrl(undefined as any)).toContain('taxecszkxqwtnxiglwbu');
  });
});
