import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const { mockDatabase } = vi.hoisted(() => {
  return { mockDatabase: [] as any[] };
});

// Mock de prisma antes de importar payment.routes
vi.mock('../utils/prisma', () => {
  const mockRecord = {
    findMany: vi.fn(async ({ where }: any) => {
      let res = [...mockDatabase];
      if (where?.studentId) res = res.filter((p) => p.studentId === where.studentId);
      if (where?.month) res = res.filter((p) => p.month === where.month);
      if (where?.id?.not) res = res.filter((p) => p.id !== where.id.not);
      if (where?.OR && Array.isArray(where.OR)) {
        res = res.filter((p) =>
          where.OR.some((cond: any) => {
            if (cond.notes?.contains) return p.notes?.includes(cond.notes.contains);
            if (cond.operationNumber) return p.operationNumber === cond.operationNumber;
            if (cond.month) return p.month === cond.month;
            return false;
          })
        );
      }
      return res;
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      return mockDatabase.find((p) => p.id === where.id) || null;
    }),
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: 'pay-' + Math.random().toString(36).substring(2, 9),
        studentId: data.studentId,
        month: data.month,
        amount: data.amount,
        expectedAmount: data.expectedAmount ?? 22000,
        remainingDebt: data.remainingDebt ?? 0,
        isPartial: data.isPartial ?? false,
        concept: data.concept ?? 'Cuota Mensual',
        operationNumber: data.operationNumber ?? null,
        paymentMethod: data.paymentMethod,
        receiptUrl: data.receiptUrl ?? null,
        notes: data.notes ?? null,
        paidAt: data.paidAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockDatabase.push(record);
      return record;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const idx = mockDatabase.findIndex((p) => p.id === where.id);
      if (idx === -1) throw new Error('Not found');
      mockDatabase[idx] = { ...mockDatabase[idx], ...data, updatedAt: new Date().toISOString() };
      return mockDatabase[idx];
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      for (let i = 0; i < mockDatabase.length; i++) {
        let match = true;
        if (where?.studentId && mockDatabase[i].studentId !== where.studentId) match = false;
        if (where?.month && mockDatabase[i].month !== where.month) match = false;
        if (match) {
          mockDatabase[i] = { ...mockDatabase[i], ...data };
          count++;
        }
      }
      return { count };
    }),
    delete: vi.fn(async ({ where }: any) => {
      const idx = mockDatabase.findIndex((p) => p.id === where.id);
      if (idx !== -1) {
        const deleted = mockDatabase.splice(idx, 1)[0];
        return deleted;
      }
      throw new Error('Not found');
    }),
    deleteMany: vi.fn(async ({ where }: any) => {
      const initial = mockDatabase.length;
      if (where?.studentId && where?.month) {
        const remaining = mockDatabase.filter((p) => !(p.studentId === where.studentId && p.month === where.month));
        mockDatabase.length = 0;
        mockDatabase.push(...remaining);
      } else if (where?.studentId && where?.OR) {
        const remaining = mockDatabase.filter((p) => {
          if (p.studentId !== where.studentId) return true;
          const matches = where.OR.some((cond: any) => {
            if (cond.month && p.month === cond.month) return true;
            if (cond.notes?.contains && p.notes?.includes(cond.notes.contains)) return true;
            if (cond.operationNumber && p.operationNumber === cond.operationNumber) return true;
            return false;
          });
          return !matches;
        });
        mockDatabase.length = 0;
        mockDatabase.push(...remaining);
      }
      return { count: initial - mockDatabase.length };
    }),
  };

  return {
    prisma: {
      paymentRecord: mockRecord,
    },
  };
});

import paymentRouter from '../routes/payment.routes';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/payments', paymentRouter);

describe('Payment System Unit Tests: Trazabilidad, Excedentes, Modificación y Anulación a 0', () => {
  beforeEach(() => {
    mockDatabase.length = 0;
  });

  it('1. Registro de pago exacto ($22.000): cuota saldada con deuda $0', async () => {
    const res = await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 22000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(22000);
    expect(res.body.remainingDebt).toBe(0);
    expect(res.body.isPartial).toBe(false);
    expect(mockDatabase).toHaveLength(1);
    expect(mockDatabase[0].month).toBe('2026-11');
  });

  it('2. Registro de pago parcial ($15.000 de $22.000): registra deuda restante de $7.000', async () => {
    const res = await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 15000,
        expectedAmount: 22000,
        paymentMethod: 'TRANSFER',
      });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(15000);
    expect(res.body.remainingDebt).toBe(7000);
    expect(res.body.isPartial).toBe(true);
  });

  it('3. Acumulación de pagos en el mismo mes ($20.000 efvo + $2.000 transf): salda la cuota completa', async () => {
    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 20000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    const res2 = await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 2000,
        expectedAmount: 22000,
        paymentMethod: 'TRANSFER',
      });

    expect(res2.status).toBe(200);
    expect(mockDatabase).toHaveLength(2);
    expect(mockDatabase[0].remainingDebt).toBe(0);
    expect(mockDatabase[1].remainingDebt).toBe(0);
    expect(mockDatabase[0].isPartial).toBe(false);
    expect(mockDatabase[1].isPartial).toBe(false);
  });

  it('4. Registro con excedente ($30.000 para cuota de $22.000): salda Noviembre ($22.000) y acredita $8.000 a Diciembre (Enero queda en 0)', async () => {
    const res = await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 30000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(200);

    // Debe haber exactamente 2 registros en la base de datos: Noviembre y Diciembre (Enero no debe existir)
    expect(mockDatabase).toHaveLength(2);

    const novPayment = mockDatabase.find((p) => p.month === '2026-11');
    const decPayment = mockDatabase.find((p) => p.month === '2026-12');
    const janPayment = mockDatabase.find((p) => p.month === '2027-01');

    expect(novPayment).toBeDefined();
    expect(novPayment.amount).toBe(22000);
    expect(novPayment.remainingDebt).toBe(0);
    expect(novPayment.isPartial).toBe(false);

    expect(decPayment).toBeDefined();
    expect(decPayment.amount).toBe(8000);
    expect(decPayment.notes).toContain(`[ORIGIN:${novPayment.id}]`);
    expect(decPayment.operationNumber).toBe(`SURPLUS:${novPayment.id}`);

    // ¡Enero DEBE ESTAR EN 0!
    expect(janPayment).toBeUndefined();
  });

  it('5. Modificación de pago a menor que la cuota ($15.000): Noviembre queda parcial ($15.000) y Diciembre vuelve a 0 (excedente eliminado)', async () => {
    // 1. Crear pago con excedente ($30.000)
    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 30000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    const novPayment = mockDatabase.find((p) => p.month === '2026-11');
    expect(novPayment).toBeDefined();
    expect(mockDatabase.find((p) => p.month === '2026-12')).toBeDefined();

    // 2. Modificar el pago de Noviembre a $15.000
    const updateRes = await request(testApp)
      .put(`/api/payments/${novPayment.id}`)
      .send({
        amount: 15000,
        expectedAmount: 22000,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.amount).toBe(15000);
    expect(updateRes.body.remainingDebt).toBe(7000);
    expect(updateRes.body.isPartial).toBe(true);

    // El excedente en Diciembre debe haber sido eliminado automáticamente
    const decAfter = mockDatabase.find((p) => p.month === '2026-12');
    expect(decAfter).toBeUndefined();
    expect(mockDatabase).toHaveLength(1);
  });

  it('6. Modificación de pago a $0: anula el pago de Noviembre y elimina el excedente de Diciembre (ambos vuelven a 0)', async () => {
    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 30000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    const novPayment = mockDatabase.find((p) => p.month === '2026-11');

    // Editar a monto 0
    const res = await request(testApp)
      .put(`/api/payments/${novPayment.id}`)
      .send({ amount: 0 });

    expect(res.status).toBe(200);
    // Ambos meses deben quedar completamente en 0 (sin registros)
    expect(mockDatabase).toHaveLength(0);
  });

  it('7. Eliminación individual de pago con excedente (DELETE /api/payments/:id): borra Noviembre y Diciembre en cascada', async () => {
    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 30000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    const novPayment = mockDatabase.find((p) => p.month === '2026-11');
    const deleteRes = await request(testApp).delete(`/api/payments/${novPayment.id}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(mockDatabase).toHaveLength(0);
  });

  it('8. Anulación masiva del mes (DELETE /api/payments/reset-month): anula todos los pagos del mes y sus excedentes (vuelve a 0)', async () => {
    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 20000,
        expectedAmount: 22000,
        paymentMethod: 'CASH',
      });

    await request(testApp)
      .post('/api/payments')
      .send({
        studentId: 'student-100',
        month: '2026-11',
        amount: 5000, // $2.000 cubren nov, $3.000 van a dic
        expectedAmount: 22000,
        paymentMethod: 'TRANSFER',
      });

    expect(mockDatabase.filter((p) => p.month === '2026-11')).toHaveLength(2);
    expect(mockDatabase.filter((p) => p.month === '2026-12')).toHaveLength(1);

    // Resetear todo Noviembre para esta alumna
    const resetRes = await request(testApp)
      .delete('/api/payments/reset-month')
      .query({ studentId: 'student-100', month: '2026-11' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Tanto Noviembre como Diciembre vuelven a estar totalmente en 0
    expect(mockDatabase).toHaveLength(0);
  });
});
