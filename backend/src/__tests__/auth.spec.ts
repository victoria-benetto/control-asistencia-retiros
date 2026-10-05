import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Unified Auth & Access Flow Integration Tests', () => {
  it('SuperAdmin Victoria DNI 44122509 requires password Vulpiare2026!', async () => {
    // 1. Without password -> PASSWORD_REQUIRED
    const resNoPass = await request(app)
      .post('/api/auth/login')
      .send({ dni: '44122509' });
    
    expect(resNoPass.status).toBe(200);
    expect(resNoPass.body.type).toBe('PASSWORD_REQUIRED');
    expect(resNoPass.body.role).toBe('SUPER_ADMIN');

    // 2. Wrong password -> 401
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({ dni: '44122509', password: 'WrongPassword123' });

    expect(resWrongPass.status).toBe(401);
    expect(resWrongPass.body.error).toBeDefined();

    // 3. Correct password -> ADMIN response
    const resCorrectPass = await request(app)
      .post('/api/auth/login')
      .send({ dni: '44122509', password: 'Vulpiare2026!' });

    expect(resCorrectPass.status).toBe(200);
    expect(resCorrectPass.body.type).toBe('ADMIN');
    expect(resCorrectPass.body.user.role).toBe('SUPER_ADMIN');
    expect(resCorrectPass.body.user.dni).toBe('44122509');
  });

  it('Docente DNI 43213538 requires password 123456', async () => {
    // 1. Without password
    const resNoPass = await request(app)
      .post('/api/auth/login')
      .send({ dni: '43213538' });

    expect(resNoPass.status).toBe(200);
    expect(resNoPass.body.type).toBe('PASSWORD_REQUIRED');

    // 2. Correct default password
    const resCorrectPass = await request(app)
      .post('/api/auth/login')
      .send({ dni: '43213538', password: '123456' });

    expect(resCorrectPass.status).toBe(200);
    expect(resCorrectPass.body.type).toBe('ADMIN');
    expect(resCorrectPass.body.user.role).toBe('ADMIN');
  });

  it('Empty or invalid DNI returns 400 bad request', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El DNI es requerido.');
  });

  it('Non-existent DNI returns 404', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ dni: '00000000' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('No se encontró ninguna alumna o docente registrada con este DNI');
  });
});
