import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
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

    try {
      // Consultar pagos previos para este alumno y mes para acumulación correcta
      const previousPayments = await (prisma as any).paymentRecord.findMany({
        where: { studentId, month },
      });

      const previousTotal = previousPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const totalAfterPayment = previousTotal + parsedAmount;

      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (previousPayments[0]?.expectedAmount || parsedAmount);

      const remainingDebt = targetExpected > totalAfterPayment ? targetExpected - totalAfterPayment : 0;
      const isPartial = remainingDebt > 0;

      const savedRecord = await (prisma as any).paymentRecord.create({
        data: {
          studentId,
          month,
          amount: parsedAmount,
          expectedAmount: targetExpected,
          remainingDebt,
          isPartial,
          concept: concept || (previousPayments[0]?.concept || null),
          operationNumber: operationNumber || null,
          paymentMethod,
          receiptUrl: receiptUrl || null,
          notes: notes || null,
          paidAt: paymentDate,
          recordedByAdminId: recordedByAdminId || null,
        },
        include: {
          student: true,
          recordedBy: { select: { fullName: true } },
        },
      });

      // Actualizar saldo adeudado y estado en pagos previos del mismo mes para mantener consistencia
      if (previousPayments.length > 0) {
        await (prisma as any).paymentRecord.updateMany({
          where: { studentId, month },
          data: {
            expectedAmount: targetExpected,
            remainingDebt,
            isPartial,
          },
        });
      }

      return res.status(200).json(savedRecord);
    } catch (dbError) {
      console.warn('⚠️ Guardando pago en fallback local:', dbError);
      const list = getLocalPayments();
      const previousPayments = list.filter((p) => p.studentId === studentId && p.month === month);
      const previousTotal = previousPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const totalAfterPayment = previousTotal + parsedAmount;
      const targetExpected = expectedAmount !== undefined
        ? Number(expectedAmount)
        : (previousPayments[0]?.expectedAmount || parsedAmount);
      const remainingDebt = targetExpected > totalAfterPayment ? targetExpected - totalAfterPayment : 0;
      const isPartial = remainingDebt > 0;

      const record: LocalPayment = {
        id: 'pay-' + Date.now(),
        studentId,
        month,
        amount: parsedAmount,
        expectedAmount: targetExpected,
        remainingDebt,
        isPartial,
        concept: concept || (previousPayments[0]?.concept || undefined),
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al registrar el pago: ' + err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, expectedAmount, concept, operationNumber, paymentMethod, receiptUrl, notes, paidAt } = req.body;

  try {
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (expectedAmount !== undefined) updateData.expectedAmount = Number(expectedAmount);
    if (concept !== undefined) updateData.concept = concept;
    if (operationNumber !== undefined) updateData.operationNumber = operationNumber;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
    if (notes !== undefined) updateData.notes = notes;
    if (paidAt !== undefined) updateData.paidAt = new Date(paidAt);

    if (updateData.amount !== undefined || updateData.expectedAmount !== undefined) {
      const exp = updateData.expectedAmount ?? updateData.amount;
      const act = updateData.amount ?? exp;
      updateData.remainingDebt = exp > act ? exp - act : 0;
      updateData.isPartial = updateData.remainingDebt > 0;
    }

    try {
      const updated = await (prisma as any).paymentRecord.update({
        where: { id },
        data: updateData,
        include: {
          student: true,
          recordedBy: { select: { fullName: true } },
        },
      });
      return res.json(updated);
    } catch (dbError) {
      const list = getLocalPayments();
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      list[idx] = {
        ...list[idx],
        ...updateData,
        paidAt: updateData.paidAt ? updateData.paidAt.toISOString() : list[idx].paidAt,
        updatedAt: new Date().toISOString(),
      };
      saveLocalPayments(list);
      return res.json(list[idx]);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al modificar el pago: ' + err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    try {
      const toDelete = await (prisma as any).paymentRecord.findUnique({ where: { id } });
      await (prisma as any).paymentRecord.delete({
        where: { id },
      });
      if (toDelete) {
        const remaining = await (prisma as any).paymentRecord.findMany({
          where: { studentId: toDelete.studentId, month: toDelete.month },
        });
        const total = remaining.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        const exp = remaining[0]?.expectedAmount || 22000;
        const newDebt = exp > total ? exp - total : 0;
        const isPart = newDebt > 0;
        if (remaining.length > 0) {
          await (prisma as any).paymentRecord.updateMany({
            where: { studentId: toDelete.studentId, month: toDelete.month },
            data: { remainingDebt: newDebt, isPartial: isPart },
          });
        }
      }
      return res.json({ success: true, message: 'Pago eliminado correctamente' });
    } catch (dbError) {
      let list = getLocalPayments();
      const toDelete = list.find((p) => p.id === id);
      list = list.filter((p) => p.id !== id);
      if (toDelete) {
        const remaining = list.filter((p) => p.studentId === toDelete.studentId && p.month === toDelete.month);
        const total = remaining.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const exp = remaining[0]?.expectedAmount || 22000;
        const newDebt = exp > total ? exp - total : 0;
        const isPart = newDebt > 0;
        for (const p of list) {
          if (p.studentId === toDelete.studentId && p.month === toDelete.month) {
            p.remainingDebt = newDebt;
            p.isPartial = isPart;
          }
        }
      }
      saveLocalPayments(list);
      return res.json({ success: true, message: 'Pago eliminado correctamente (fallback)' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al eliminar pago: ' + err.message });
  }
});

export default router;
