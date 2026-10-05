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
});
