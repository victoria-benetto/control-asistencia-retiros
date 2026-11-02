import { OFFICIAL_SHIFTS } from '../types';

export type StudentPlan = 'CLASE_SUELTA' | 'UNA_VEZ' | 'DOS_VECES' | 'TRES_VECES' | 'PASE_LIBRE';
export type ScheduleEntry = { day: string; shift: string };

// Inscripción: pago único anual, separado de la cuota mensual
export const ENROLLMENT_FEE = 20000;

export const STUDENT_PLANS: Record<StudentPlan, { label: string; fee: number; days: number }> = {
  CLASE_SUELTA: { label: 'Clase suelta', fee: 10000, days: 0 },
  UNA_VEZ: { label: '1 vez por semana', fee: 35000, days: 1 },
  DOS_VECES: { label: '2 veces por semana', fee: 37000, days: 2 },
  TRES_VECES: { label: '3 veces por semana', fee: 40000, days: 3 },
  PASE_LIBRE: { label: 'Pase libre', fee: 60000, days: 5 },
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

export const formatMoney = (n: number) => `$${n.toLocaleString('es-AR')}`;

export const describeSchedule = (schedule?: ScheduleEntry[] | null) =>
  (schedule || [])
    .map((e) => {
      const day = WEEK_DAYS.find((d) => d.key === e.day)?.label || e.day;
      const time = DAY_SHIFTS[e.day]?.find((s) => s.shift === e.shift)?.label || e.shift;
      return `${day} ${time}`;
    })
    .join(' · ');
