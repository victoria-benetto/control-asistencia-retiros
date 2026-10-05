import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Attendance & Pickup Flow Integration Tests', () => {
  it('GET /api/attendance/today returns students list for shift and date', async () => {
    const res = await request(app)
      .get('/api/attendance/today')
      .query({ shift: 'Lunes y miércoles de 8 a 10', date: '2026-10-05' });

    expect(res.status).toBe(200);
    expect(res.body.shift).toBe('Lunes y miércoles de 8 a 10');
    expect(res.body.date).toBe('2026-10-05');
    expect(Array.isArray(res.body.students)).toBe(true);
  });

  it('POST /api/attendance requires studentId and valid status PRESENT/ABSENT', async () => {
    const resInvalid = await request(app)
      .post('/api/attendance')
      .send({ studentId: 'invalid', status: 'INVALID_STATUS' });

    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error).toBeDefined();
  });

  it('GET /api/attendance/history returns historical attendance records', async () => {
    const res = await request(app)
      .get('/api/attendance/history')
      .query({ shift: 'Lunes y miércoles de 8 a 10' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
