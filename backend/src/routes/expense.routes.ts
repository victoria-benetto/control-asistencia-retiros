import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import fs from 'fs';
import path from 'path';

const router = Router();

interface LocalExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  month: string;
  category?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recordedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_EXPENSES_FILE = path.join(__dirname, '../../data_expenses.json');

const INITIAL_EXPENSES: LocalExpense[] = [
  {
    id: 'exp-default-1',
    title: 'Alquiler Gimnasio Principal',
    amount: 150000,
    date: '2026-11-01',
    month: '2026-11',
    category: 'Alquiler',
    receiptUrl: null,
    notes: 'Pago mensual del espacio de entrenamiento y telas',
    isRecurring: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-default-2',
    title: 'Seguro de Responsabilidad Civil & Emergencias',
    amount: 35000,
    date: '2026-11-05',
    month: '2026-11',
    category: 'Seguros',
    receiptUrl: null,
    notes: 'Póliza cobertura de alumnas',
    isRecurring: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exp-default-3',
    title: 'Servicio de Limpieza y Mantenimiento',
    amount: 40000,
    date: '2026-11-03',
    month: '2026-11',
    category: 'Servicios',
    receiptUrl: null,
    notes: 'Insumos y mantenimiento del salón',
    isRecurring: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getLocalExpenses(): LocalExpense[] {
  try {
    if (!fs.existsSync(LOCAL_EXPENSES_FILE)) {
      fs.writeFileSync(LOCAL_EXPENSES_FILE, JSON.stringify(INITIAL_EXPENSES, null, 2), 'utf-8');
      return INITIAL_EXPENSES;
    }
    const raw = fs.readFileSync(LOCAL_EXPENSES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error al leer data_expenses.json local:', err);
    return INITIAL_EXPENSES;
  }
}

function saveLocalExpenses(expenses: LocalExpense[]) {
  try {
    fs.writeFileSync(LOCAL_EXPENSES_FILE, JSON.stringify(expenses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al guardar data_expenses.json local:', err);
  }
}

// =========================================================================
// RUTAS GASTOS FIJOS
// =========================================================================

// Listar gastos fijos (opcionalmente filtrados por mes YYYY-MM)
router.get('/', async (req: Request, res: Response) => {
  const { month } = req.query;

  try {
    const where: any = {};
    if (month) where.month = String(month);

    const expenses = await (prisma as any).fixedExpense.findMany({
      where,
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            dni: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    if (expenses && expenses.length > 0) {
      return res.json(expenses);
    }

    let local = getLocalExpenses();
    if (month) local = local.filter((e) => e.month === String(month));
    return res.json(local);
  } catch (error) {
    console.warn('⚠️ Fallback activo en /api/expenses:', error);
    let local = getLocalExpenses();
    if (month) local = local.filter((e) => e.month === String(month));
    return res.json(local);
  }
});

// Registrar nuevo gasto fijo
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      amount,
      date,
      month,
      category,
      receiptUrl,
      notes,
      isRecurring,
      recordedByAdminId,
    } = req.body;

    if (!title || amount === undefined) {
      return res.status(400).json({ error: 'Título y monto del gasto son obligatorios.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Monto inválido.' });
    }

    const expenseDate = date || new Date().toISOString().split('T')[0];
    const expenseMonth = month || expenseDate.slice(0, 7);

    try {
      const created = await (prisma as any).fixedExpense.create({
        data: {
          title: String(title).trim(),
          amount: numAmount,
          date: expenseDate,
          month: expenseMonth,
          category: category ? String(category).trim() : 'Servicios',
          receiptUrl: receiptUrl || null,
          notes: notes ? String(notes).trim() : null,
          isRecurring: isRecurring !== false,
          recordedByAdminId: recordedByAdminId || null,
        },
        include: {
          recordedBy: {
            select: { id: true, fullName: true, dni: true },
          },
        },
      });

      // Sincronizar en local
      const list = getLocalExpenses();
      list.unshift(created);
      saveLocalExpenses(list);

      return res.status(201).json(created);
    } catch (dbError) {
      console.warn('⚠️ Fallback guardando en data_expenses.json:', dbError);
      const newExp: LocalExpense = {
        id: `exp-${Date.now()}`,
        title: String(title).trim(),
        amount: numAmount,
        date: expenseDate,
        month: expenseMonth,
        category: category ? String(category).trim() : 'Servicios',
        receiptUrl: receiptUrl || null,
        notes: notes ? String(notes).trim() : null,
        isRecurring: isRecurring !== false,
        recordedByAdminId: recordedByAdminId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const list = getLocalExpenses();
      list.unshift(newExp);
      saveLocalExpenses(list);
      return res.status(201).json(newExp);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al registrar gasto fijo: ' + err.message });
  }
});

// Modificar gasto fijo existente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, amount, date, month, category, receiptUrl, notes, isRecurring } = req.body;

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = String(title).trim();
    if (amount !== undefined) dataToUpdate.amount = Number(amount);
    if (date !== undefined) {
      dataToUpdate.date = String(date);
      if (!month) dataToUpdate.month = String(date).slice(0, 7);
    }
    if (month !== undefined) dataToUpdate.month = String(month);
    if (category !== undefined) dataToUpdate.category = String(category).trim();
    if (receiptUrl !== undefined) dataToUpdate.receiptUrl = receiptUrl || null;
    if (notes !== undefined) dataToUpdate.notes = notes ? String(notes).trim() : null;
    if (isRecurring !== undefined) dataToUpdate.isRecurring = Boolean(isRecurring);

    try {
      const updated = await (prisma as any).fixedExpense.update({
        where: { id },
        data: dataToUpdate,
        include: {
          recordedBy: { select: { id: true, fullName: true, dni: true } },
        },
      });

      // Sincronizar local
      let list = getLocalExpenses();
      list = list.map((e) => (e.id === id ? { ...e, ...dataToUpdate, updatedAt: new Date().toISOString() } : e));
      saveLocalExpenses(list);

      return res.json(updated);
    } catch (dbError) {
      let list = getLocalExpenses();
      let target = list.find((e) => e.id === id);
      if (!target) {
        return res.status(404).json({ error: 'Gasto fijo no encontrado.' });
      }
      Object.assign(target, dataToUpdate, { updatedAt: new Date().toISOString() });
      saveLocalExpenses(list);
      return res.json(target);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al actualizar gasto fijo: ' + err.message });
  }
});

// Eliminar gasto fijo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    try {
      await (prisma as any).fixedExpense.delete({ where: { id } });
    } catch (dbError) {
      console.warn('Fallback eliminando de local:', dbError);
    }

    let list = getLocalExpenses();
    list = list.filter((e) => e.id !== id);
    saveLocalExpenses(list);

    return res.json({ success: true, message: 'Gasto fijo eliminado con éxito.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al eliminar gasto fijo: ' + err.message });
  }
});

// Replicar gasto individual a otro mes (ej. Alquiler del gimnasio repetido)
router.post('/:id/replicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetMonth, amount } = req.body;

    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      return res.status(400).json({ error: 'El mes destino (formato YYYY-MM) es obligatorio.' });
    }

    let sourceExpense: any = null;
    try {
      sourceExpense = await (prisma as any).fixedExpense.findUnique({ where: { id } });
    } catch (e) {
      // Ignorar fallo remoto
    }
    if (!sourceExpense) {
      sourceExpense = getLocalExpenses().find((e) => e.id === id);
    }

    if (!sourceExpense) {
      return res.status(404).json({ error: 'Gasto origen no encontrado para replicar.' });
    }

    // Calcular la fecha para el mes destino preservando el día del mes
    const day = (sourceExpense.date || '2026-11-01').split('-')[2] || '01';
    const newDate = `${targetMonth}-${day}`;
    const finalAmount = amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0
      ? Number(amount)
      : sourceExpense.amount;

    const newExpenseData = {
      title: sourceExpense.title,
      amount: finalAmount,
      date: newDate,
      month: targetMonth,
      category: sourceExpense.category,
      receiptUrl: sourceExpense.receiptUrl,
      notes: sourceExpense.notes
        ? `${sourceExpense.notes} (Replicado de ${sourceExpense.month})`
        : `Replicado de ${sourceExpense.month}`,
      isRecurring: sourceExpense.isRecurring,
      recordedByAdminId: sourceExpense.recordedByAdminId,
    };

    try {
      const replicated = await (prisma as any).fixedExpense.create({
        data: newExpenseData,
        include: {
          recordedBy: { select: { id: true, fullName: true, dni: true } },
        },
      });

      const list = getLocalExpenses();
      list.unshift(replicated);
      saveLocalExpenses(list);

      return res.status(201).json(replicated);
    } catch (dbError) {
      const localReplicated: LocalExpense = {
        id: `exp-${Date.now()}`,
        ...newExpenseData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const list = getLocalExpenses();
      list.unshift(localReplicated);
      saveLocalExpenses(list);
      return res.status(201).json(localReplicated);
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al replicar gasto: ' + err.message });
  }
});

// Replicar gastos seleccionados o lote completo de un mes hacia otro
router.post('/replicate-month', async (req: Request, res: Response) => {
  try {
    const { fromMonth, toMonth, expenseIds, customAmounts } = req.body;

    if (!fromMonth || !toMonth) {
      return res.status(400).json({ error: 'Mes origen (fromMonth) y mes destino (toMonth) son requeridos.' });
    }

    let targetExpenses: any[] = [];
    const hasSpecificIds = Array.isArray(expenseIds) && expenseIds.length > 0;

    if (hasSpecificIds) {
      try {
        targetExpenses = await (prisma as any).fixedExpense.findMany({
          where: { id: { in: expenseIds } },
        });
      } catch (e) {
        // Ignorar fallo remoto
      }
      if (!targetExpenses || targetExpenses.length === 0) {
        targetExpenses = getLocalExpenses().filter((e) => expenseIds.includes(e.id));
      }
    } else {
      try {
        targetExpenses = await (prisma as any).fixedExpense.findMany({
          where: { month: String(fromMonth), isRecurring: true },
        });
      } catch (e) {
        // Ignorar fallo
      }
      if (!targetExpenses || targetExpenses.length === 0) {
        targetExpenses = getLocalExpenses().filter(
          (e) => e.month === String(fromMonth) && e.isRecurring !== false
        );
      }
    }

    if (!targetExpenses || targetExpenses.length === 0) {
      return res.status(404).json({
        error: hasSpecificIds
          ? 'No se encontraron los gastos seleccionados para replicar.'
          : `No se encontraron gastos para replicar en el mes ${fromMonth}.`,
      });
    }

    const createdList: any[] = [];
    for (const exp of targetExpenses) {
      const day = (exp.date || '2026-11-01').split('-')[2] || '01';
      const newDate = `${toMonth}-${day}`;
      const finalAmount =
        customAmounts && customAmounts[exp.id] !== undefined && !isNaN(Number(customAmounts[exp.id]))
          ? Number(customAmounts[exp.id])
          : exp.amount;

      const data = {
        title: exp.title,
        amount: finalAmount,
        date: newDate,
        month: toMonth,
        category: exp.category,
        receiptUrl: exp.receiptUrl,
        notes: exp.notes ? `${exp.notes} (Replicado de ${exp.month || fromMonth})` : `Replicado de ${exp.month || fromMonth}`,
        isRecurring: exp.isRecurring !== false,
        recordedByAdminId: exp.recordedByAdminId,
      };

      try {
        const created = await (prisma as any).fixedExpense.create({ data });
        createdList.push(created);
      } catch (err) {
        const localCreated: LocalExpense = {
          id: `exp-${Date.now()}-${Math.random()}`,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        createdList.push(localCreated);
      }
    }

    const list = getLocalExpenses();
    list.unshift(...createdList);
    saveLocalExpenses(list);

    return res.json({
      success: true,
      message: `Se replicaron ${createdList.length} gastos con éxito a ${toMonth}.`,
      expenses: createdList,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al replicar gastos: ' + err.message });
  }
});

export default router;
