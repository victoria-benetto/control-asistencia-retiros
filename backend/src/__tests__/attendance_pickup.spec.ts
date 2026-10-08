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

  it('Allows a student to record distinct attendances for two different shifts on the same date', async () => {
    const shift1 = 'Lunes y miércoles de 8 a 10';
    const shift2 = 'Lunes, miércoles y viernes de 17:30 a 19';
    const testDate = '2026-10-10';

    // Fetch existing students list to get a valid studentId
    const todayRes = await request(app)
      .get('/api/attendance/today')
      .query({ shift: shift1, date: testDate });

    let targetStudentId = 'test-student-fallback';
    if (todayRes.body.students && todayRes.body.students.length > 0) {
      targetStudentId = todayRes.body.students[0].student.id;
    }

    // 1. Mark attendance for shift 1
    const res1 = await request(app)
      .post('/api/attendance')
      .send({
        studentId: targetStudentId,
        status: 'PRESENT',
        date: testDate,
        shift: shift1,
        isMakeup: true,
        makeupShift: shift1,
      });

    expect(res1.status).toBe(200);
    expect(res1.body.shift).toBe(shift1);
    expect(res1.body.status).toBe('PRESENT');

    // 2. Mark attendance for shift 2 on the same date
    const res2 = await request(app)
      .post('/api/attendance')
      .send({
        studentId: targetStudentId,
        status: 'ABSENT',
        date: testDate,
        shift: shift2,
        isMakeup: true,
        makeupShift: shift2,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.shift).toBe(shift2);
    expect(res2.body.status).toBe('ABSENT');
    expect(res2.body.id).not.toBe(res1.body.id); // Distinct attendance records created for distinct shifts!
  });
});
