import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/prisma';

describe('Web Push Notifications API Tests', () => {
  const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-sub-token-' + Date.now();
  let testStudentId: string;

  afterAll(async () => {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: testEndpoint },
      });
    } catch (e) {
      // ignore
    }
  });

  it('GET /api/notifications/vapid-public-key returns the configured VAPID public key', async () => {
    const res = await request(app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBeDefined();
    expect(typeof res.body.publicKey).toBe('string');
    expect(res.body.publicKey.length).toBeGreaterThan(20);
  });

  it('POST /api/notifications/subscribe rejects requests with missing or invalid fields', async () => {
    // Missing studentId
    const res1 = await request(app).post('/api/notifications/subscribe').send({
      subscription: {
        endpoint: 'https://test.com',
        keys: { p256dh: 'abc', auth: '123' },
      },
    });
    expect(res1.status).toBe(400);

    // Missing keys
    const res2 = await request(app).post('/api/notifications/subscribe').send({
      studentId: 'some-id',
      subscription: {
        endpoint: 'https://test.com',
      },
    });
    expect(res2.status).toBe(400);

    // Non-existent student
    const res3 = await request(app).post('/api/notifications/subscribe').send({
      studentId: 'non-existent-uuid-9999',
      subscription: {
        endpoint: 'https://test.com',
        keys: { p256dh: 'abc', auth: '123' },
      },
    });
    expect(res3.status).toBe(404);
  });

  it('POST /api/notifications/subscribe successfully registers and updates a subscription', async () => {
    // Find an existing student in the DB
    const student = await prisma.student.findFirst();
    expect(student).toBeDefined();
    testStudentId = student!.id;

    const res = await request(app)
      .post('/api/notifications/subscribe')
      .send({
        studentId: testStudentId,
        subscription: {
          endpoint: testEndpoint,
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK18WK25ypqS9DaYtsqtxQVryZRe4TyurPeUVZ0qtEZbGoSZigWChGFrY96Va0rSdkAZuA=',
            auth: 'tBHItJI5svbpez7KI4CCXg==',
          },
        },
        userAgent: 'Vitest Mobile Chrome 130',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is stored in DB
    const stored = await prisma.pushSubscription.findUnique({
      where: { endpoint: testEndpoint },
    });
    expect(stored).toBeDefined();
    expect(stored?.studentId).toBe(testStudentId);
    expect(stored?.p256dh).toContain('BNcRdreALRFXTk');

    // Test upsert: re-subscribing same endpoint updates cleanly
    const resUpdate = await request(app)
      .post('/api/notifications/subscribe')
      .send({
        studentId: testStudentId,
        subscription: {
          endpoint: testEndpoint,
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK18WK25ypqS9DaYtsqtxQVryZRe4TyurPeUVZ0qtEZbGoSZigWChGFrY96Va0rSdkAZuA=',
            auth: 'UPDATED_AUTH_TOKEN==',
          },
        },
        userAgent: 'Vitest Chrome Updated',
      });

    expect(resUpdate.status).toBe(200);
    const updated = await prisma.pushSubscription.findUnique({
      where: { endpoint: testEndpoint },
    });
    expect(updated?.auth).toBe('UPDATED_AUTH_TOKEN==');
  });

  it('POST /api/notifications/unsubscribe deletes subscription by endpoint', async () => {
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ endpoint: testEndpoint });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await prisma.pushSubscription.findUnique({
      where: { endpoint: testEndpoint },
    });
    expect(deleted).toBeNull();
  });
});
