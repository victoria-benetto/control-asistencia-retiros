import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { isNonCuotaConcept } from '../utils/plans';
import fs from 'fs';
import path from 'path';

const router = Router();

// Fallbacks locales en caso de que las tablas aún no estén sincronizadas en PostgreSQL remoto
interface LocalPayment {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  expectedAmount?: number;
  remainingDebt?: number;
  isPartial?: boolean;
  concept?: string;
  operationNumber?: string;
  paymentMethod: 'TRANSFER' | 'CASH';
  receiptUrl?: string | null;
  notes?: string | null;
  paidAt: string;
  recordedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LocalConcept {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_PAYMENTS_FILE = path.join(__dirname, '../../data_payments.json');
const LOCAL_CONCEPTS_FILE = path.join(__dirname, '../../data_concepts.json');

const INITIAL_CONCEPTS: LocalConcept[] = [
  {
    id: 'concept-1',
    name: 'Cuota Mensual',
    amount: 22000,
    description: 'Cuota regular de actividades mensuales',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'concept-2',
    name: 'Matrícula Anual',
    amount: 15000,
    description: 'Inscripción y seguro anual Vulpiare',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'concept-3',
    name: 'Clase Suelta',
    amount: 8000,
    description: 'Pase individual por clase',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'concept-4',
    name: 'Pase Libre',
    amount: 35000,
    description: 'Acceso total a todas las disciplinas del estudio',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getLocalPayments(): LocalPayment[] {
  try {
    if (fs.existsSync(LOCAL_PAYMENTS_FILE)) {
      const data = fs.readFileSync(LOCAL_PAYMENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('⚠️ Error al leer pagos locales:', e);
  }
  return [];
}

function saveLocalPayments(payments: LocalPayment[]) {
  try {
    fs.writeFileSync(LOCAL_PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf-8');
  } catch (e) {
    console.warn('⚠️ Error al guardar pagos locales:', e);
  }
}

function getLocalConcepts(): LocalConcept[] {
  try {
    if (fs.existsSync(LOCAL_CONCEPTS_FILE)) {
      const data = fs.readFileSync(LOCAL_CONCEPTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('⚠️ Error al leer conceptos locales:', e);
  }
  return INITIAL_CONCEPTS;
}

function saveLocalConcepts(concepts: LocalConcept[]) {
  try {
    fs.writeFileSync(LOCAL_CONCEPTS_FILE, JSON.stringify(concepts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('⚠️ Error al guardar conceptos locales:', e);
  }
}

function getNextMonth(monthStr: string): string {
  const [yearStr, monthNumStr] = (monthStr || '').split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);
  if (isNaN(year) || isNaN(month)) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

// =========================================================================
// RUTAS ABM DE CONCEPTOS DE PAGO
// =========================================================================

router.get('/concepts', async (_req: Request, res: Response) => {
  try {
    const concepts = await (prisma as any).paymentConcept.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (concepts && concepts.length > 0) {
      return res.json(concepts);
    }
    return res.json(getLocalConcepts());
  } catch (error) {
    console.warn('⚠️ Fallback activo en /api/payments/concepts:', error);
    return res.json(getLocalConcepts());
  }
});

router.post('/concepts', async (req: Request, res: Response) => {
  try {
    const { name, amount, description } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ error: 'Nombre y monto del concepto son obligatorios.' });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Monto inválido.' });
    }

    try {
      const created = await (prisma as any).paymentConcept.create({
        data: {
          name: name.trim(),
          amount: parsedAmount,
          description: description?.trim() || null,
          isActive: true,
        },
      });
      return res.status(201).json(created);
    } catch (dbError) {
      const list = getLocalConcepts();
      const newConcept: LocalConcept = {
        id: 'concept-' + Date.now(),
        name: name.trim(),
        amount: parsedAmount,
        description: description?.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newConcept);
      saveLocalConcepts(list);
      return res.status(201).json(newConcept);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al crear concepto: ' + err.message });
  }
});

router.put('/concepts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, amount, description, isActive } = req.body;

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (amount !== undefined) updateData.amount = Number(amount);
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    try {
      const updated = await (prisma as any).paymentConcept.update({
        where: { id },
        data: updateData,
      });
      return res.json(updated);
    } catch (dbError) {
      const list = getLocalConcepts();
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Concepto no encontrado' });
      list[idx] = {
        ...list[idx],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      saveLocalConcepts(list);
      return res.json(list[idx]);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al actualizar concepto: ' + err.message });
  }
});

router.delete('/concepts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    try {
      await (prisma as any).paymentConcept.delete({ where: { id } });
      return res.json({ success: true, message: 'Concepto eliminado' });
    } catch (dbError) {
      let list = getLocalConcepts();
      list = list.filter((c) => c.id !== id);
      saveLocalConcepts(list);
      return res.json({ success: true, message: 'Concepto eliminado (fallback)' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al eliminar concepto: ' + err.message });
  }
});

// =========================================================================
// RUTAS DE REGISTRO Y GESTIÓN DE PAGOS
// =========================================================================

router.get('/', async (req: Request, res: Response) => {
  const { month, studentId } = req.query;

  try {
    const where: any = {};
    if (month) where.month = String(month);
    if (studentId) where.studentId = String(studentId);

    const payments = await (prisma as any).paymentRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            shift: true,
            status: true,
            plan: true,
            monthlyFee: true,
            authorizedPeople: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            dni: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    return res.json(payments);
  } catch (error) {
    console.warn('⚠️ Fallback activo en /api/payments:', error);
    let list = getLocalPayments();
    if (month) list = list.filter((p) => p.month === String(month));
    if (studentId) list = list.filter((p) => p.studentId === String(studentId));
    return res.json(list);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      month,
      amount,
      expectedAmount,
      concept,
      operationNumber,
      paymentMethod,
      receiptUrl,
      notes,
      recordedByAdminId,
      paidAt,
    } = req.body;

    if (!studentId || !month || amount === undefined || !paymentMethod) {
      return res.status(400).json({
        error: 'studentId, month, amount y paymentMethod son requeridos.',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Monto inválido.' });
    }

    const paymentDate = paidAt ? new Date(paidAt) : new Date();

    if (isNonCuotaConcept(concept)) {
      // Seguro, Inscripción o Matrícula: Se registran de forma independiente sin alterar la cuota mensual ni generar excedentes
      try {
        const record = await (prisma as any).paymentRecord.create({
          data: {
            studentId,
            month,
            amount: parsedAmount,
            expectedAmount: expectedAmount !== undefined ? Number(expectedAmount) : parsedAmount,
            remainingDebt: 0,
            isPartial: false,
            concept: concept || 'Seguro Anual',
            operationNumber: operationNumber || null,
            paymentMethod,
            receiptUrl: receiptUrl || null,
            notes: notes || null,
            paidAt: paymentDate,
            recordedByAdminId: recordedByAdminId || null,
          },
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });
        return res.status(200).json(record);
      } catch (dbErr) {
        console.warn('⚠️ Fallback guardando pago no-cuota local:', dbErr);
        const localPayment: LocalPayment = {
          id: 'pay-local-' + Date.now(),
          studentId,
          month,
          amount: parsedAmount,
          expectedAmount: expectedAmount !== undefined ? Number(expectedAmount) : parsedAmount,
          remainingDebt: 0,
          isPartial: false,
          concept: concept || 'Seguro Anual',
          operationNumber: operationNumber || undefined,
          paymentMethod,
          receiptUrl: receiptUrl || null,
          notes: notes || null,
          paidAt: paymentDate.toISOString(),
          recordedByAdminId: recordedByAdminId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const list = getLocalPayments();
        list.unshift(localPayment);
        saveLocalPayments(list);
        return res.status(200).json(localPayment);
      }
    }

    try {
      // 1. Pagos previos en el mes seleccionado
      const allPrevInMonth = await (prisma as any).paymentRecord.findMany({
        where: { studentId, month },
      });
      const prevPayments = allPrevInMonth.filter((p: any) => !isNonCuotaConcept(p.concept));
      const prevTotal = prevPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      // Cuota del plan de la alumna (si tiene plan asignado) como monto esperado por defecto
      let studentPlan: any = null;
      try {
        if ((prisma as any).student?.findUnique) {
          studentPlan = await (prisma as any).student.findUnique({ where: { id: studentId }, select: { monthlyFee: true } });
        }
      } catch (e) {}
      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (prevPayments[0]?.expectedAmount || studentPlan?.monthlyFee || 22000);

      const needed = Math.max(0, targetExpected - prevTotal);

      // Caso A: El monto cubre parte o el total exacto del mes actual (sin excedente)
      if (needed > 0 && parsedAmount <= needed) {
        const totalAfter = prevTotal + parsedAmount;
        const remainingDebt = targetExpected > totalAfter ? targetExpected - totalAfter : 0;
        const isPartial = remainingDebt > 0;

        const record = await (prisma as any).paymentRecord.create({
          data: {
            studentId,
            month,
            amount: parsedAmount,
            expectedAmount: targetExpected,
            remainingDebt,
            isPartial,
            concept: concept || (prevPayments[0]?.concept || 'Cuota Mensual'),
            operationNumber: operationNumber || null,
            paymentMethod,
            receiptUrl: receiptUrl || null,
            notes: notes || null,
            paidAt: paymentDate,
            recordedByAdminId: recordedByAdminId || null,
          },
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });

        if (prevPayments.length > 0) {
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId, month },
            data: { expectedAmount: targetExpected, remainingDebt, isPartial },
          });
        }

        return res.status(200).json(record);
      }

      // Caso B: Hay excedente a favor (parsedAmount > needed, o needed === 0)
      const currentMonthAmount = needed;
      const surplus = parsedAmount - needed;
      let primaryRecord: any = null;

      if (currentMonthAmount > 0) {
        primaryRecord = await (prisma as any).paymentRecord.create({
          data: {
            studentId,
            month,
            amount: currentMonthAmount,
            expectedAmount: targetExpected,
            remainingDebt: 0,
            isPartial: false,
            concept: concept || (prevPayments[0]?.concept || 'Cuota Mensual'),
            operationNumber: operationNumber || null,
            paymentMethod,
            receiptUrl: receiptUrl || null,
            notes: notes || null,
            paidAt: paymentDate,
            recordedByAdminId: recordedByAdminId || null,
          },
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });

        if (prevPayments.length > 0) {
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId, month },
            data: { expectedAmount: targetExpected, remainingDebt: 0, isPartial: false },
          });
        }
      }

      // Acreditar el saldo sobrante como pago al mes que le sigue
      const nextMonth = getNextMonth(month);
      const allNextPrevInMonth = await (prisma as any).paymentRecord.findMany({
        where: { studentId, month: nextMonth },
      });
      const nextPrevPayments = allNextPrevInMonth.filter((p: any) => !isNonCuotaConcept(p.concept));
      const nextPrevTotal = nextPrevPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const nextExpected = nextPrevPayments[0]?.expectedAmount || targetExpected;
      const nextTotal = nextPrevTotal + surplus;
      const nextDebt = nextExpected > nextTotal ? nextExpected - nextTotal : 0;
      const nextPartial = nextDebt > 0;

      const originId = primaryRecord ? primaryRecord.id : 'DIRECT';
      const surplusRecord = await (prisma as any).paymentRecord.create({
        data: {
          studentId,
          month: nextMonth,
          amount: surplus,
          expectedAmount: nextExpected,
          remainingDebt: nextDebt,
          isPartial: nextPartial,
          concept: concept || 'Cuota Mensual',
          operationNumber: `SURPLUS:${originId}`,
          paymentMethod,
          receiptUrl: receiptUrl || null,
          notes: `[ORIGIN:${originId}] Excedente acreditado del pago de ${month}${notes ? ` - ${notes}` : ''}`,
          paidAt: paymentDate,
          recordedByAdminId: recordedByAdminId || null,
        },
        include: { student: true, recordedBy: { select: { fullName: true } } },
      });

      if (nextPrevPayments.length > 0) {
        await (prisma as any).paymentRecord.updateMany({
          where: { studentId, month: nextMonth },
          data: { expectedAmount: nextExpected, remainingDebt: nextDebt, isPartial: nextPartial },
        });
      }

      return res.status(200).json(primaryRecord || surplusRecord);
    } catch (dbError) {
      console.warn('⚠️ Guardando pago en fallback local:', dbError);
      const list = getLocalPayments();
      const prevPayments = list.filter((p) => p.studentId === studentId && p.month === month);
      const prevTotal = prevPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (prevPayments[0]?.expectedAmount || 22000);
      const needed = Math.max(0, targetExpected - prevTotal);

      if (needed > 0 && parsedAmount <= needed) {
        const totalAfter = prevTotal + parsedAmount;
        const remainingDebt = targetExpected > totalAfter ? targetExpected - totalAfter : 0;
        const isPartial = remainingDebt > 0;

        const record: LocalPayment = {
          id: 'pay-' + Date.now(),
          studentId,
          month,
          amount: parsedAmount,
          expectedAmount: targetExpected,
          remainingDebt,
          isPartial,
          concept: concept || (prevPayments[0]?.concept || 'Cuota Mensual'),
          operationNumber: operationNumber || undefined,
          paymentMethod,
          receiptUrl: receiptUrl || null,
          notes: notes || null,
          paidAt: paymentDate.toISOString(),
          recordedByAdminId: recordedByAdminId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        for (const p of list) {
          if (p.studentId === studentId && p.month === month) {
            p.expectedAmount = targetExpected;
            p.remainingDebt = remainingDebt;
            p.isPartial = isPartial;
          }
        }
        list.push(record);
        saveLocalPayments(list);
        return res.status(200).json(record);
      }

      const currentMonthAmount = needed;
      const surplus = parsedAmount - needed;
      let primaryRecord: LocalPayment | null = null;

      if (currentMonthAmount > 0) {
        primaryRecord = {
          id: 'pay-' + Date.now(),
          studentId,
          month,
          amount: currentMonthAmount,
          expectedAmount: targetExpected,
          remainingDebt: 0,
          isPartial: false,
          concept: concept || (prevPayments[0]?.concept || 'Cuota Mensual'),
          operationNumber: operationNumber || undefined,
          paymentMethod,
          receiptUrl: receiptUrl || null,
          notes: notes || null,
          paidAt: paymentDate.toISOString(),
          recordedByAdminId: recordedByAdminId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        for (const p of list) {
          if (p.studentId === studentId && p.month === month) {
            p.expectedAmount = targetExpected;
            p.remainingDebt = 0;
            p.isPartial = false;
          }
        }
        list.push(primaryRecord);
      }

      const nextMonth = getNextMonth(month);
      const nextPrevPayments = list.filter((p) => p.studentId === studentId && p.month === nextMonth);
      const nextPrevTotal = nextPrevPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const nextExpected = nextPrevPayments[0]?.expectedAmount || targetExpected;
      const nextTotal = nextPrevTotal + surplus;
      const nextDebt = nextExpected > nextTotal ? nextExpected - nextTotal : 0;
      const nextPartial = nextDebt > 0;
      const originId = primaryRecord ? primaryRecord.id : 'DIRECT';

      const surplusRecord: LocalPayment = {
        id: 'pay-' + (Date.now() + 1),
        studentId,
        month: nextMonth,
        amount: surplus,
        expectedAmount: nextExpected,
        remainingDebt: nextDebt,
        isPartial: nextPartial,
        concept: concept || 'Cuota Mensual',
        operationNumber: `SURPLUS:${originId}`,
        paymentMethod,
        receiptUrl: receiptUrl || null,
        notes: `[ORIGIN:${originId}] Excedente acreditado del pago de ${month}${notes ? ` - ${notes}` : ''}`,
        paidAt: paymentDate.toISOString(),
        recordedByAdminId: recordedByAdminId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      for (const p of list) {
        if (p.studentId === studentId && p.month === nextMonth) {
          p.expectedAmount = nextExpected;
          p.remainingDebt = nextDebt;
          p.isPartial = nextPartial;
        }
      }
      list.push(surplusRecord);
      saveLocalPayments(list);

      return res.status(200).json(primaryRecord || surplusRecord);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al registrar el pago: ' + err.message });
  }
});

// Anulación en cascada de un pago y todos sus excedentes asociados
async function deletePaymentWithSurplus(id: string, res: Response) {
  try {
    const toDelete = await (prisma as any).paymentRecord.findUnique({ where: { id } });
    if (!toDelete) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    if (isNonCuotaConcept(toDelete.concept)) {
      await (prisma as any).paymentRecord.delete({ where: { id } });
      let list = getLocalPayments();
      list = list.filter((p) => p.id !== id);
      saveLocalPayments(list);
      return res.json({ success: true, message: 'Pago no-cuota anulado correctamente.' });
    }

    // Buscar y eliminar excedentes hijos generados por este pago en meses posteriores
    const childSurpluses = await (prisma as any).paymentRecord.findMany({
      where: {
        studentId: toDelete.studentId,
        OR: [
          { notes: { contains: `[ORIGIN:${id}]` } },
          { operationNumber: `SURPLUS:${id}` },
        ],
      },
    });

    const affectedMonths: string[] = Array.from(new Set(childSurpluses.map((c: any) => String(c.month))));

    for (const child of childSurpluses) {
      await (prisma as any).paymentRecord.delete({ where: { id: child.id } });
    }

    // Recalcular saldo adeudado en cada mes hijo afectado
    for (const cm of affectedMonths) {
      const remainingChildMonth = await (prisma as any).paymentRecord.findMany({
        where: { studentId: toDelete.studentId, month: cm },
      });
      const cTotal = remainingChildMonth.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const cExp = remainingChildMonth[0]?.expectedAmount || 22000;
      const cDebt = Math.max(0, cExp - cTotal);
      if (remainingChildMonth.length > 0) {
        await (prisma as any).paymentRecord.updateMany({
          where: { studentId: toDelete.studentId, month: cm },
          data: { remainingDebt: cDebt, isPartial: cDebt > 0 },
        });
      }
    }

    // Eliminar el pago principal
    await (prisma as any).paymentRecord.delete({ where: { id } });

    // Recalcular el mes principal
    const remainingInMonth = await (prisma as any).paymentRecord.findMany({
      where: { studentId: toDelete.studentId, month: toDelete.month },
    });
    const mTotal = remainingInMonth.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const mExp = remainingInMonth[0]?.expectedAmount || 22000;
    const mDebt = Math.max(0, mExp - mTotal);
    if (remainingInMonth.length > 0) {
      await (prisma as any).paymentRecord.updateMany({
        where: { studentId: toDelete.studentId, month: toDelete.month },
        data: { remainingDebt: mDebt, isPartial: mDebt > 0 },
      });
    }

    return res.json({ success: true, message: 'Pago y excedentes asociados anulados correctamente.' });
  } catch (dbError) {
    let list = getLocalPayments();
    const toDelete = list.find((p) => p.id === id);
    if (!toDelete) {
      return res.status(404).json({ error: 'Pago no encontrado (fallback)' });
    }

    const childSurpluses = list.filter(
      (p) =>
        p.studentId === toDelete.studentId &&
        ((p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
    );
    const affectedMonths = [...new Set(childSurpluses.map((c) => c.month))];

    list = list.filter(
      (p) =>
        p.id !== id &&
        !((p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
    );

    for (const cm of affectedMonths) {
      const remainingChild = list.filter((p) => p.studentId === toDelete.studentId && p.month === cm);
      const cTotal = remainingChild.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const cExp = remainingChild[0]?.expectedAmount || 22000;
      const cDebt = Math.max(0, cExp - cTotal);
      for (const p of list) {
        if (p.studentId === toDelete.studentId && p.month === cm) {
          p.remainingDebt = cDebt;
          p.isPartial = cDebt > 0;
        }
      }
    }

    const remainingMonth = list.filter((p) => p.studentId === toDelete.studentId && p.month === toDelete.month);
    const mTotal = remainingMonth.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const mExp = remainingMonth[0]?.expectedAmount || 22000;
    const mDebt = Math.max(0, mExp - mTotal);
    for (const p of list) {
      if (p.studentId === toDelete.studentId && p.month === toDelete.month) {
        p.remainingDebt = mDebt;
        p.isPartial = mDebt > 0;
      }
    }

    saveLocalPayments(list);
    return res.json({ success: true, message: 'Pago y excedentes asociados anulados correctamente (fallback).' });
  }
}

// Anulación masiva de todos los pagos de una alumna en un mes y sus excedentes vinculados (Volver a 0)
router.delete('/reset-month', async (req: Request, res: Response) => {
  const { studentId, month } = req.query;
  if (!studentId || !month) {
    return res.status(400).json({ error: 'studentId y month son requeridos' });
  }
  const sId = String(studentId);
  const mStr = String(month);

  try {
    const monthPayments = await (prisma as any).paymentRecord.findMany({
      where: { studentId: sId, month: mStr },
    });
    const paymentIds = monthPayments.map((p: any) => p.id);

    const childSurpluses = await (prisma as any).paymentRecord.findMany({
      where: {
        studentId: sId,
        OR: paymentIds.flatMap((id: string) => [
          { notes: { contains: `[ORIGIN:${id}]` } },
          { operationNumber: `SURPLUS:${id}` },
        ]),
      },
    });
    const childMonths: string[] = Array.from(new Set(childSurpluses.map((c: any) => String(c.month))));

    await (prisma as any).paymentRecord.deleteMany({
      where: {
        studentId: sId,
        OR: [
          { month: mStr },
          ...paymentIds.flatMap((id: string) => [
            { notes: { contains: `[ORIGIN:${id}]` } },
            { operationNumber: `SURPLUS:${id}` },
          ]),
        ],
      },
    });

    for (const cm of childMonths) {
      const remainingChild = await (prisma as any).paymentRecord.findMany({
        where: { studentId: sId, month: cm },
      });
      const cTotal = remainingChild.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const cExp = remainingChild[0]?.expectedAmount || 22000;
      const cDebt = Math.max(0, cExp - cTotal);
      if (remainingChild.length > 0) {
        await (prisma as any).paymentRecord.updateMany({
          where: { studentId: sId, month: cm },
          data: { remainingDebt: cDebt, isPartial: cDebt > 0 },
        });
      }
    }

    return res.json({ success: true, message: 'Todos los pagos del mes y sus excedentes fueron anulados correctamente' });
  } catch (dbError) {
    let list = getLocalPayments();
    const monthPayments = list.filter((p) => p.studentId === sId && p.month === mStr);
    const paymentIds = monthPayments.map((p) => p.id);

    const childSurpluses = list.filter(
      (p) =>
        p.studentId === sId &&
        paymentIds.some((id) => (p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
    );
    const childMonths = [...new Set(childSurpluses.map((c) => c.month))];

    list = list.filter(
      (p) =>
        !(p.studentId === sId && p.month === mStr) &&
        !paymentIds.some((id) => (p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
    );

    for (const cm of childMonths) {
      const remainingChild = list.filter((p) => p.studentId === sId && p.month === cm);
      const cTotal = remainingChild.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const cExp = remainingChild[0]?.expectedAmount || 22000;
      const cDebt = Math.max(0, cExp - cTotal);
      for (const p of list) {
        if (p.studentId === sId && p.month === cm) {
          p.remainingDebt = cDebt;
          p.isPartial = cDebt > 0;
        }
      }
    }

    saveLocalPayments(list);
    return res.json({ success: true, message: 'Todos los pagos del mes y sus excedentes fueron anulados correctamente (fallback)' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, expectedAmount, concept, operationNumber, paymentMethod, receiptUrl, notes, paidAt } = req.body;

  try {
    const parsedAmount = amount !== undefined ? Number(amount) : undefined;

    // Si el usuario edita el monto a 0 o menos, equivale a anular el pago por completo
    if (parsedAmount !== undefined && parsedAmount <= 0) {
      return await deletePaymentWithSurplus(id, res);
    }

    try {
      const target = await (prisma as any).paymentRecord.findUnique({ where: { id } });
      if (!target) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }

      const updateData: any = {};
      if (concept !== undefined) updateData.concept = concept;
      if (operationNumber !== undefined) updateData.operationNumber = operationNumber;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
      if (notes !== undefined) updateData.notes = notes;
      if (paidAt !== undefined) updateData.paidAt = new Date(paidAt);

      if (isNonCuotaConcept(concept || target.concept)) {
        const updated = await (prisma as any).paymentRecord.update({
          where: { id },
          data: {
            ...updateData,
            ...(parsedAmount !== undefined ? { amount: parsedAmount, expectedAmount: parsedAmount } : {}),
            remainingDebt: 0,
            isPartial: false,
          },
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });
        return res.json(updated);
      }

      if (parsedAmount === undefined) {
        const updated = await (prisma as any).paymentRecord.update({
          where: { id },
          data: updateData,
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });
        return res.json(updated);
      }

      // Re-cómputo del mes del pago
      const otherPayments = await (prisma as any).paymentRecord.findMany({
        where: { studentId: target.studentId, month: target.month, id: { not: id } },
      });
      const otherTotal = otherPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (target.expectedAmount || 22000);
      const needed = Math.max(0, targetExpected - otherTotal);

      // Buscar si tenía excedentes hijos en meses posteriores
      const childSurpluses = await (prisma as any).paymentRecord.findMany({
        where: {
          studentId: target.studentId,
          OR: [
            { notes: { contains: `[ORIGIN:${id}]` } },
            { operationNumber: `SURPLUS:${id}` },
          ],
        },
      });

      if (parsedAmount <= needed) {
        // No hay excedente. El mes actual recibe parsedAmount (completo o parcial)
        const totalMonth = otherTotal + parsedAmount;
        const newDebt = targetExpected > totalMonth ? targetExpected - totalMonth : 0;
        const isPart = newDebt > 0;

        updateData.amount = parsedAmount;
        updateData.expectedAmount = targetExpected;
        updateData.remainingDebt = newDebt;
        updateData.isPartial = isPart;

        const updated = await (prisma as any).paymentRecord.update({
          where: { id },
          data: updateData,
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });

        if (otherPayments.length > 0) {
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId: target.studentId, month: target.month },
            data: { expectedAmount: targetExpected, remainingDebt: newDebt, isPartial: isPart },
          });
        }

        // Eliminar excedentes en meses posteriores porque ya no hay saldo sobrante
        for (const child of childSurpluses) {
          await (prisma as any).paymentRecord.delete({ where: { id: child.id } });
          const remainingChildMonth = await (prisma as any).paymentRecord.findMany({
            where: { studentId: target.studentId, month: child.month },
          });
          const cTotal = remainingChildMonth.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
          const cExp = remainingChildMonth[0]?.expectedAmount || targetExpected;
          const cDebt = Math.max(0, cExp - cTotal);
          if (remainingChildMonth.length > 0) {
            await (prisma as any).paymentRecord.updateMany({
              where: { studentId: target.studentId, month: child.month },
              data: { remainingDebt: cDebt, isPartial: cDebt > 0 },
            });
          }
        }

        return res.json(updated);
      } else {
        // Sí hay excedente: parsedAmount > needed
        const newSurplus = parsedAmount - needed;
        updateData.amount = needed;
        updateData.expectedAmount = targetExpected;
        updateData.remainingDebt = 0;
        updateData.isPartial = false;

        const updated = await (prisma as any).paymentRecord.update({
          where: { id },
          data: updateData,
          include: { student: true, recordedBy: { select: { fullName: true } } },
        });

        if (otherPayments.length > 0) {
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId: target.studentId, month: target.month },
            data: { expectedAmount: targetExpected, remainingDebt: 0, isPartial: false },
          });
        }

        const nextMonth = getNextMonth(target.month);
        if (childSurpluses.length > 0) {
          const firstChild = childSurpluses[0];
          await (prisma as any).paymentRecord.update({
            where: { id: firstChild.id },
            data: { amount: newSurplus },
          });
          for (let i = 1; i < childSurpluses.length; i++) {
            await (prisma as any).paymentRecord.delete({ where: { id: childSurpluses[i].id } });
          }
          const remainingNext = await (prisma as any).paymentRecord.findMany({
            where: { studentId: target.studentId, month: nextMonth },
          });
          const nTotal = remainingNext.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
          const nExp = remainingNext[0]?.expectedAmount || targetExpected;
          const nDebt = Math.max(0, nExp - nTotal);
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId: target.studentId, month: nextMonth },
            data: { remainingDebt: nDebt, isPartial: nDebt > 0 },
          });
        } else {
          const nextPrev = await (prisma as any).paymentRecord.findMany({
            where: { studentId: target.studentId, month: nextMonth },
          });
          const nTotal = nextPrev.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) + newSurplus;
          const nExp = nextPrev[0]?.expectedAmount || targetExpected;
          const nDebt = Math.max(0, nExp - nTotal);
          await (prisma as any).paymentRecord.create({
            data: {
              studentId: target.studentId,
              month: nextMonth,
              amount: newSurplus,
              expectedAmount: nExp,
              remainingDebt: nDebt,
              isPartial: nDebt > 0,
              concept: target.concept || 'Cuota Mensual',
              operationNumber: `SURPLUS:${id}`,
              paymentMethod: target.paymentMethod,
              receiptUrl: target.receiptUrl,
              notes: `[ORIGIN:${id}] Excedente acreditado del pago de ${target.month}`,
              paidAt: target.paidAt,
              recordedByAdminId: target.recordedByAdminId,
            },
          });
          if (nextPrev.length > 0) {
            await (prisma as any).paymentRecord.updateMany({
              where: { studentId: target.studentId, month: nextMonth },
              data: { remainingDebt: nDebt, isPartial: nDebt > 0 },
            });
          }
        }

        return res.json(updated);
      }
    } catch (dbError) {
      const list = getLocalPayments();
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Pago no encontrado (fallback)' });
      }

      const target = list[idx];
      if (parsedAmount === undefined) {
        if (concept !== undefined) target.concept = concept;
        if (paymentMethod !== undefined) target.paymentMethod = paymentMethod;
        if (receiptUrl !== undefined) target.receiptUrl = receiptUrl;
        if (notes !== undefined) target.notes = notes;
        saveLocalPayments(list);
        return res.json(target);
      }

      const numAmount = parsedAmount;
      const otherPayments = list.filter((p) => p.studentId === target.studentId && p.month === target.month && p.id !== id);
      const otherTotal = otherPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (target.expectedAmount || 22000);
      const needed = Math.max(0, targetExpected - otherTotal);

      if (numAmount <= needed) {
        const totalMonth = otherTotal + numAmount;
        const newDebt = targetExpected > totalMonth ? targetExpected - totalMonth : 0;
        const isPart = newDebt > 0;

        target.amount = numAmount;
        target.expectedAmount = targetExpected;
        target.remainingDebt = newDebt;
        target.isPartial = isPart;
        if (concept !== undefined) target.concept = concept;
        if (paymentMethod !== undefined) target.paymentMethod = paymentMethod;

        for (const p of otherPayments) {
          p.expectedAmount = targetExpected;
          p.remainingDebt = newDebt;
          p.isPartial = isPart;
        }

        const childSurpluses = list.filter(
          (p) =>
            p.studentId === target.studentId &&
            ((p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
        );
        const childMonths: string[] = Array.from(new Set(childSurpluses.map((c) => String(c.month))));

        const updatedList = list.filter(
          (p) =>
            !((p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
        );

        for (const cm of childMonths) {
          const remainingChild = updatedList.filter((p) => p.studentId === target.studentId && p.month === cm);
          const cTotal = remainingChild.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const cExp = remainingChild[0]?.expectedAmount || targetExpected;
          const cDebt = Math.max(0, cExp - cTotal);
          for (const p of updatedList) {
            if (p.studentId === target.studentId && p.month === cm) {
              p.remainingDebt = cDebt;
              p.isPartial = cDebt > 0;
            }
          }
        }

        saveLocalPayments(updatedList);
        return res.json(target);
      } else {
        const newSurplus = numAmount - needed;
        target.amount = needed;
        target.expectedAmount = targetExpected;
        target.remainingDebt = 0;
        target.isPartial = false;

        for (const p of otherPayments) {
          p.expectedAmount = targetExpected;
          p.remainingDebt = 0;
          p.isPartial = false;
        }

        const nextMonth = getNextMonth(target.month);
        const childIdx = list.findIndex(
          (p) =>
            p.studentId === target.studentId &&
            ((p.notes && p.notes.includes(`[ORIGIN:${id}]`)) || p.operationNumber === `SURPLUS:${id}`)
        );

        if (childIdx !== -1) {
          list[childIdx].amount = newSurplus;
        } else {
          list.push({
            id: 'pay-' + (Date.now() + 1),
            studentId: target.studentId,
            month: nextMonth,
            amount: newSurplus,
            expectedAmount: targetExpected,
            remainingDebt: Math.max(0, targetExpected - newSurplus),
            isPartial: targetExpected > newSurplus,
            concept: target.concept,
            operationNumber: `SURPLUS:${id}`,
            paymentMethod: target.paymentMethod,
            receiptUrl: target.receiptUrl,
            notes: `[ORIGIN:${id}] Excedente acreditado del pago de ${target.month}`,
            paidAt: target.paidAt,
            recordedByAdminId: target.recordedByAdminId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        saveLocalPayments(list);
        return res.json(target);
      }
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al modificar el pago: ' + err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  return await deletePaymentWithSurplus(id, res);
});

export default router;
