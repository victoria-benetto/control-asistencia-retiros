import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Student ABM Integration Tests & Bug Regressions', () => {
  it('Regression Test for Bug 210d9bc: Empty authorizedPeople rows should be sanitized without throwing DB errors', async () => {
    // Attempt creating student with empty authorizedPeople array containing empty strings
    const testDni = `99${Date.now().toString().slice(-6)}`;
    const payload = {
      firstName: 'TestStudent',
      lastName: 'Regression210d9bc',
      dni: testDni,
      shift: 'Lunes y miércoles de 8 a 10',
      authorizedPeople: [
        { fullName: '', dni: '', relationship: '', phone: '' },
        { fullName: '  ', dni: '  ', relationship: '', phone: '' },
      ],
    };

    const res = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '44122509') // SuperAdmin header
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.firstName).toBe('TestStudent');
    expect(res.body.authorizedPeople).toHaveLength(0); // Empty rows sanitized cleanly!

    // Cleanup created test student
    if (res.body.id) {
      await request(app)
        .delete(`/api/admin/students/${res.body.id}`)
        .set('x-user-dni', '44122509');
    }
  });

  it('Non-SuperAdmin cannot create students (Strict Role Check)', async () => {
    const payload = {
      firstName: 'Unauthorized',
      lastName: 'Attempt',
      dni: '99999992',
      shift: 'Lunes y miércoles de 8 a 10',
    };

    const res = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '43213538') // Regular Admin Teacher
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Acceso denegado');
  });

  it('SuperAdmin can manage student statuses (ACTIVE, TEMPORARILY_INACTIVE, INACTIVE)', async () => {
    const testDni = `98${Date.now().toString().slice(-6)}`;
    const createRes = await request(app)
      .post('/api/admin/students')
      .set('x-user-dni', '44122509')
      .send({
        firstName: 'Status',
        lastName: 'TestStudent',
        dni: testDni,
        shift: 'Lunes y miércoles de 8 a 10',
        status: 'TEMPORARILY_INACTIVE',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('TEMPORARILY_INACTIVE');
    const studentId = createRes.body.id;

    try {
      // Update status to INACTIVE
      const updateRes1 = await request(app)
        .put(`/api/admin/students/${studentId}`)
        .set('x-user-dni', '44122509')
        .send({ status: 'INACTIVE' });

      expect(updateRes1.status).toBe(200);
      expect(updateRes1.body.status).toBe('INACTIVE');

      // Update status back to ACTIVE
      const updateRes2 = await request(app)
        .put(`/api/admin/students/${studentId}`)
        .set('x-user-dni', '44122509')
        .send({ status: 'ACTIVE' });

      expect(updateRes2.status).toBe(200);
      expect(updateRes2.body.status).toBe('ACTIVE');

      // Verify GET /api/students?status=ACTIVE includes student
      const listRes = await request(app)
        .get('/api/students')
        .query({ status: 'ACTIVE' });

      expect(listRes.status).toBe(200);
      const found = listRes.body.find((s: any) => s.id === studentId);
      expect(found).toBeDefined();
      expect(found.status).toBe('ACTIVE');
      expect(Array.isArray(found.attendances)).toBe(true);
    } finally {
      if (studentId) {
        await request(app).delete(`/api/admin/students/${studentId}`).set('x-user-dni', '44122509');
      }
    }
  });
});
