import { prisma } from './prisma';
import { sendPushToStudent } from './webPush';
import { STUDENT_PLANS, isNonCuotaConcept, isClaseSueltaConcept } from './plans';

export interface ReminderDispatchResult {
  executed: boolean;
  day: number;
  month: string;
  reason?: string;
  totalActiveStudents: number;
  unpaidStudentsCount: number;
  pushAttempts: number;
  pushSent: number;
  pushFailed: number;
  pushPruned: number;
}

/**
 * Obtiene la fecha actual en la zona horaria oficial de Argentina (UTC-3).
 */
export function getArgentinaDate(): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  monthStr: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  const [yearStr, monthStrPart, dayStr] = dateStr.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStrPart, 10),
    day: parseInt(dayStr, 10),
    dateStr,
    monthStr: `${yearStr}-${monthStrPart}`,
  };
}

/**
 * Retorna el mensaje oficial para los días estipulados de recordatorio (9, 10, 15, 20 y 25).
 * Para cualquier otro día retorna null.
 */
export function getCronReminderMessage(day: number): { title: string; body: string } | null {
  if (day === 9) {
    return {
      title: '💜 Recordatorio de Cuota - Vulpiare',
      body: 'Recordá que tenés hasta mañana para pagar tu cuota con el precio base. A partir del día 11 se aplicará un 10% de recargo.',
    };
  }
  if (day === 10) {
    return {
      title: '🚨 Vencimiento de Cuota - Vulpiare',
      body: '¡Hoy es el último día! Tenés hasta las 23:59 hs para pagar tu cuota con el precio base. A partir de mañana se aplicará un 10% de recargo.',
    };
  }
  if (day === 15) {
    return {
      title: '⚠️ Aviso de Cuota Vencida - Vulpiare',
      body: 'Tu cuota mensual se encuentra vencida con el 10% de recargo. Por favor regularizá tu pago a la brevedad.',
    };
  }
  if (day === 20) {
    return {
      title: '📢 Segundo Aviso: Cuota Vencida - Vulpiare',
      body: 'Recordá que tenés tu cuota mensual pendiente de pago. Por favor regularizá tu situación para mantener tu cuenta al día.',
    };
  }
  if (day === 25) {
    return {
      title: '🚨 Último Aviso de Cuota - Vulpiare',
      body: 'Último aviso del mes: tu cuota continúa pendiente. Por favor regularizá tu pago antes del cierre del período.',
    };
  }
  return null;
}

/**
 * Ejecuta el proceso programado de recordatorios de cuotas vencidas e impagas.
 * Se despacha únicamente los días 9, 10, 15, 20 y 25.
 */
export async function runPaymentRemindersCron(options?: {
  dayOverride?: number;
  monthOverride?: string;
  force?: boolean;
}): Promise<ReminderDispatchResult> {
  const argDate = getArgentinaDate();
  const day = options?.dayOverride ?? argDate.day;
  const month = options?.monthOverride ?? argDate.monthStr;

  const reminderMessage = getCronReminderMessage(day);

  if (!reminderMessage && !options?.force) {
    return {
      executed: false,
      day,
      month,
      reason: `El día ${day} no forma parte del cronograma de avisos automáticos (días 9, 10, 15, 20 y 25).`,
      totalActiveStudents: 0,
      unpaidStudentsCount: 0,
      pushAttempts: 0,
      pushSent: 0,
      pushFailed: 0,
      pushPruned: 0,
    };
  }

  const messageToUse = reminderMessage || {
    title: '📢 Aviso de Cuota - Vulpiare',
    body: 'Recordá revisar el estado de tu cuota en el portal de Vulpiare.',
  };

  // 1. Obtener todas las alumnas activas
  const activeStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      plan: true,
      monthlyFee: true,
    },
  });

  // Obtener concepto de cuota por defecto
  const cuotaConcept = await prisma.paymentConcept.findFirst({
    where: { isActive: true, name: { contains: 'cuota', mode: 'insensitive' } },
  }).catch(() => null);

  const defaultFee = cuotaConcept?.amount || 37000;

  // 2. Obtener todos los pagos del mes en una sola consulta eficiente
  const monthPayments = await prisma.paymentRecord.findMany({
    where: { month },
    select: {
      studentId: true,
      amount: true,
      concept: true,
    },
  }).catch(() => []);

  // Agrupar pagos de cuota por studentId
  const paymentsByStudent = new Map<string, number>();
  for (const p of monthPayments) {
    if (!isNonCuotaConcept(p.concept) || isClaseSueltaConcept(p.concept)) {
      const current = paymentsByStudent.get(p.studentId) || 0;
      paymentsByStudent.set(p.studentId, current + (p.amount || 0));
    }
  }

  let unpaidCount = 0;
  let pushAttempts = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let pushPruned = 0;

  for (const student of activeStudents) {
    // Si la alumna está liberada/becada, no adeuda cuota
    if (student.plan === 'LIBERADO') continue;

    const expectedFee = (student.monthlyFee && student.monthlyFee > 0)
      ? student.monthlyFee
      : (student.plan && STUDENT_PLANS[student.plan] ? STUDENT_PLANS[student.plan].fee : defaultFee);

    if (expectedFee <= 0) continue;

    const paidSoFar = paymentsByStudent.get(student.id) || 0;

    if (paidSoFar < expectedFee) {
      unpaidCount++;

      // Despachar Push Notification en segundo plano si la alumna tiene dispositivos registrados
      try {
        const pushResult = await sendPushToStudent(student.id, {
          title: messageToUse.title,
          body: messageToUse.body,
          url: '/',
          tag: `vulpiare-fee-${month}-${day}`,
        });

        if (pushResult.total > 0) {
          pushAttempts += pushResult.total;
          pushSent += pushResult.sent;
          pushFailed += pushResult.failed;
          pushPruned += pushResult.pruned;
        }
      } catch (err) {
        console.error(`Error al despachar push a alumna ${student.id}:`, err);
      }
    }
  }

  return {
    executed: true,
    day,
    month,
    totalActiveStudents: activeStudents.length,
    unpaidStudentsCount: unpaidCount,
    pushAttempts,
    pushSent,
    pushFailed,
    pushPruned,
  };
}
