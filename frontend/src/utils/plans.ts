import { OFFICIAL_SHIFTS } from '../types';

export type StudentPlan = 'CLASE_SUELTA' | 'UNA_VEZ' | 'DOS_VECES' | 'TRES_VECES' | 'PASE_LIBRE' | 'LIBERADO';
export type ScheduleEntry = { day: string; shift: string };

// Inscripción: pago único anual, separado de la cuota mensual
export const ENROLLMENT_FEE = 20000;

export const STUDENT_PLANS: Record<StudentPlan, { label: string; fee: number; days: number }> = {
  CLASE_SUELTA: { label: 'Clase suelta', fee: 10000, days: 0 },
  UNA_VEZ: { label: '1 vez por semana', fee: 35000, days: 1 },
  DOS_VECES: { label: '2 veces por semana', fee: 37000, days: 2 },
  TRES_VECES: { label: '3 veces por semana', fee: 40000, days: 3 },
  PASE_LIBRE: { label: 'Pase libre', fee: 60000, days: 5 },
  LIBERADO: { label: 'Liberado / Beca', fee: 0, days: 0 },
};

export const WEEK_DAYS: { key: string; label: string }[] = [
  { key: 'LUNES', label: 'Lunes' },
  { key: 'MARTES', label: 'Martes' },
  { key: 'MIERCOLES', label: 'Miércoles' },
  { key: 'JUEVES', label: 'Jueves' },
  { key: 'VIERNES', label: 'Viernes' },
];

// Turnos oficiales disponibles por día, con etiqueta horaria corta
const S_1645 = { shift: OFFICIAL_SHIFTS[0], label: '16:45 a 18' };
const S_1730 = { shift: OFFICIAL_SHIFTS[1], label: '17:30 a 19' };
const S_MJ = { shift: OFFICIAL_SHIFTS[2], label: '16 a 18' };
const S_0800 = { shift: OFFICIAL_SHIFTS[3], label: '8 a 10' };

export const DAY_SHIFTS: Record<string, { shift: string; label: string }[]> = {
  LUNES: [S_0800, S_1645, S_1730],
  MARTES: [S_MJ],
  MIERCOLES: [S_0800, S_1645, S_1730],
  JUEVES: [S_MJ],
  VIERNES: [S_1645, S_1730],
};

const WEEKDAY_KEYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export function getWeekdayKey(dateStr: string): string {
  return WEEKDAY_KEYS[new Date(`${dateStr}T12:00:00`).getDay()];
}

export function studentAttendsShift(
  student: { shift: string; schedule?: any },
  targetShift: string,
  dateStr: string
): boolean {
  const schedule = Array.isArray(student.schedule) ? (student.schedule as ScheduleEntry[]) : null;
  if (!schedule || schedule.length === 0) {
    // Si no tiene cronograma detallado por día, se compara por turno
    // Pero si el turno es de lunes, miércoles y viernes, los días son 1, 3, 5
    // Si es martes y jueves, los días son 2, 4
    if (student.shift !== targetShift) return false;
    const day = new Date(`${dateStr}T12:00:00`).getDay();
    const s = (student.shift || '').toLowerCase();
    if (s.includes('martes') || s.includes('jueves')) {
      return day === 2 || day === 4;
    }
    if (s.includes('viernes')) {
      return day === 1 || day === 3 || day === 5;
    }
    return true;
  }
  const dayKey = getWeekdayKey(dateStr);
  return schedule.some((e) => e.day === dayKey && e.shift === targetShift);
}

export const formatMoney = (n: number) => `$${n.toLocaleString('es-AR')}`;

export const describeSchedule = (schedule?: ScheduleEntry[] | null) =>
  (schedule || [])
    .map((e) => {
      const day = WEEK_DAYS.find((d) => d.key === e.day)?.label || e.day;
      const time = DAY_SHIFTS[e.day]?.find((s) => s.shift === e.shift)?.label || e.shift;
      return `${day} ${time}`;
    })
    .join(' · ');

export const isNonCuotaConcept = (concept?: string | null): boolean => {
  if (!concept) return false;
  const c = concept.toLowerCase();
  return (
    c.includes('seguro') ||
    c.includes('inscrip') ||
    c.includes('matríc') ||
    c.includes('matric') ||
    c.includes('clase suelta') ||
    c.includes('suelta') ||
    c.includes('liberad') ||
    c.includes('beca')
  );
};

export const isClaseSueltaConcept = (concept?: string | null): boolean => {
  if (!concept) return false;
  const c = concept.toLowerCase();
  return c.includes('clase suelta') || c.includes('suelta');
};

export const isLiberadoConcept = (concept?: string | null): boolean => {
  if (!concept) return false;
  const c = concept.toLowerCase();
  return c.includes('liberad') || c.includes('beca');
};
