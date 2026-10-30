import { OFFICIAL_SHIFTS } from '../types';

/**
 * Determina el turno oficial por defecto según el día de la semana actual o de una fecha dada.
 * - Martes o Jueves -> 'Martes y Jueves de 16 a 18'
 * - Viernes -> 'Lunes, miércoles y viernes de 16:45 a 18' (o de 17:30 a 19 si es tarde)
 * - Lunes o Miércoles -> 'Lunes y miércoles de 8 a 10' (mañana) o 'Lunes, miércoles y viernes de 16:45 a 18' (tarde)
 * - Fin de semana -> 'Lunes, miércoles y viernes de 16:45 a 18'
 */
export function getDefaultShiftForDate(dateInput: Date | string = new Date()): string {
  let date: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // Usar mediodía local para evitar desfases por zona horaria
      date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  const currentHour = typeof dateInput === 'string' ? 16 : date.getHours();

  // Martes (2) y Jueves (4)
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    return 'Martes y Jueves de 16 a 18';
  }

  // Viernes (5)
  if (dayOfWeek === 5) {
    if (currentHour >= 17) {
      return 'Lunes, miércoles y viernes de 17:30 a 19';
    }
    return 'Lunes, miércoles y viernes de 16:45 a 18';
  }

  // Lunes (1) y Miércoles (3)
  if (dayOfWeek === 1 || dayOfWeek === 3) {
    if (currentHour < 12) {
      return 'Lunes y miércoles de 8 a 10';
    } else if (currentHour >= 17) {
      return 'Lunes, miércoles y viernes de 17:30 a 19';
    } else {
      return 'Lunes, miércoles y viernes de 16:45 a 18';
    }
  }

  // Fin de semana (Sábado 6 o Domingo 0): anticipar turno del lunes
  return 'Lunes, miércoles y viernes de 16:45 a 18';
}

/**
 * Valida si un turno corresponde a los días de la semana de una fecha determinada.
 */
export function isShiftMatchingDay(shiftName: string, dateInput: Date | string): boolean {
  if (!shiftName) return false;
  let date: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  const day = date.getDay();
  const s = shiftName.toLowerCase();

  if (day === 2 || day === 4) {
    // Martes o Jueves
    return s.includes('martes') || s.includes('jueves');
  }
  if (day === 5) {
    // Viernes
    return s.includes('viernes');
  }
  if (day === 1 || day === 3) {
    // Lunes o Miércoles
    return s.includes('lunes') || s.includes('miércoles') || s.includes('miercoles');
  }

  return true;
}
