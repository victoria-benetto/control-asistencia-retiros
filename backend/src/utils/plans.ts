import { OFFICIAL_SHIFTS } from '../routes/student.routes';

// Valor de inscripción (pago único anual, separado de la cuota mensual)
export const ENROLLMENT_FEE = 20000;

export const STUDENT_PLANS: Record<string, { label: string; fee: number; days: number }> = {
  CLASE_SUELTA: { label: 'Clase suelta', fee: 10000, days: 0 },
  UNA_VEZ: { label: '1 vez por semana', fee: 35000, days: 1 },
  DOS_VECES: { label: '2 veces por semana', fee: 37000, days: 2 },
  TRES_VECES: { label: '3 veces por semana', fee: 40000, days: 3 },
  PASE_LIBRE: { label: 'Pase libre', fee: 60000, days: 5 },
};

// Turnos oficiales disponibles por día (índices de OFFICIAL_SHIFTS)
export const DAY_SHIFTS: Record<string, string[]> = {
  LUNES: [OFFICIAL_SHIFTS[3], OFFICIAL_SHIFTS[0], OFFICIAL_SHIFTS[1]],
  MARTES: [OFFICIAL_SHIFTS[2]],
  MIERCOLES: [OFFICIAL_SHIFTS[3], OFFICIAL_SHIFTS[0], OFFICIAL_SHIFTS[1]],
  JUEVES: [OFFICIAL_SHIFTS[2]],
  VIERNES: [OFFICIAL_SHIFTS[0], OFFICIAL_SHIFTS[1]],
};

const WEEKDAY_KEYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export type ScheduleEntry = { day: string; shift: string };

export function getWeekdayKey(dateStr: string): string {
  return WEEKDAY_KEYS[new Date(`${dateStr}T12:00:00`).getDay()];
}

/**
 * Valida plan + cronograma. Devuelve el cronograma normalizado o un mensaje de error.
 */
export function validatePlanSchedule(plan: string, schedule: any): { schedule: ScheduleEntry[] } | { error: string } {
  const planDef = STUDENT_PLANS[plan];
  if (!planDef) return { error: 'Plan inválido.' };
  const list: ScheduleEntry[] = Array.isArray(schedule) ? schedule : [];
  if (planDef.days === 0) return { schedule: [] };

  const days = new Set<string>();
  for (const entry of list) {
    if (!entry || !DAY_SHIFTS[entry.day] || !DAY_SHIFTS[entry.day].includes(entry.shift)) {
      return { error: `Turno inválido para el día ${entry?.day ?? ''}.` };
    }
    if (days.has(entry.day)) return { error: `El día ${entry.day} está repetido.` };
    days.add(entry.day);
  }
  if (days.size !== planDef.days) {
    return { error: `El plan "${planDef.label}" requiere exactamente ${planDef.days} día(s).` };
  }
  return { schedule: list.map((e) => ({ day: e.day, shift: e.shift })) };
}

/**
 * Indica si la alumna debe figurar en la lista del turno para esa fecha.
 * Alumnas con cronograma: se usa el cronograma por día. Alumnas sin cronograma (legado): se usa su turno fijo.
 */
export function studentAttendsShift(student: { shift: string; schedule?: any }, targetShift: string, dateStr: string): boolean {
  const schedule = Array.isArray(student.schedule) ? (student.schedule as ScheduleEntry[]) : null;
  if (!schedule || schedule.length === 0) {
    return student.shift === targetShift;
  }
  const dayKey = getWeekdayKey(dateStr);
  return schedule.some((e) => e.day === dayKey && e.shift === targetShift);
}
