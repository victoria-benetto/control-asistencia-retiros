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

  it('Enforces that attendance in habitual shift is never recorded or returned as makeup', async () => {
    const testShift = 'Lunes y miércoles de 8 a 10';
    const testDni = `88${Date.now().toString().slice(-6)}`;
    const testDate = '2026-10-10';

    // Create a student with habitual shift = testShift
    const studentRes = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '44122509')
      .send({
        firstName: 'Elena',
        lastName: 'HabitualShiftTest',
        dni: testDni,
        shift: testShift,
        status: 'ACTIVE',
      });
    const studentId = studentRes.body.id;

    try {
      // Mark attendance in HER OWN habitual shift, but passing isMakeup: true
      const attRes = await request(app)
        .post('/api/attendance')
        .send({
          studentId,
          status: 'ABSENT',
          date: testDate,
          shift: testShift,
          isMakeup: true,
          makeupShift: testShift,
        });

      expect(attRes.status).toBe(200);
      expect(attRes.body.isMakeup).toBe(false); // Cleanly forced to false!
      expect(attRes.body.makeupShift).toBeNull();

      // Verify GET /today in testShift returns isMakeup: false
      const todayRes = await request(app)
        .get('/api/attendance/today')
        .query({ shift: testShift, date: testDate });

      const studentInToday = todayRes.body.students.find((s: any) => s.student.id === studentId);
      expect(studentInToday).toBeDefined();
      expect(studentInToday.isMakeup).toBe(false);
      expect(studentInToday.makeupShift).toBeNull();
    } finally {
      if (studentId) {
        await request(app).delete(`/api/admin/students/${studentId}`).set('x-user-dni', '44122509');
      }
    }
  });

  it('Inactive and temporarily inactive students do not appear in shift attendance', async () => {
    const testShift = 'Lunes y miércoles de 8 a 10';
    const testDni1 = `87${Date.now().toString().slice(-6)}`;
    const testDni2 = `86${Date.now().toString().slice(-6)}`;

    // Create an inactive student
    const s1Res = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '44122509')
      .send({
        firstName: 'Inactiva',
        lastName: 'Test',
        dni: testDni1,
        shift: testShift,
        status: 'INACTIVE',
      });

    // Create a temporarily inactive student
    const s2Res = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '44122509')
      .send({
        firstName: 'Temporal',
        lastName: 'Test',
        dni: testDni2,
        shift: testShift,
        status: 'TEMPORARILY_INACTIVE',
      });

    try {
      const todayRes = await request(app)
        .get('/api/attendance/today')
        .query({ shift: testShift });

      const studentIds = todayRes.body.students.map((s: any) => s.student.id);
      expect(studentIds).not.toContain(s1Res.body.id);
      expect(studentIds).not.toContain(s2Res.body.id);
    } finally {
      if (s1Res.body.id) {
        await request(app).delete(`/api/admin/students/${s1Res.body.id}`).set('x-user-dni', '44122509');
      }
      if (s2Res.body.id) {
        await request(app).delete(`/api/admin/students/${s2Res.body.id}`).set('x-user-dni', '44122509');
      }
    }
  });
});
