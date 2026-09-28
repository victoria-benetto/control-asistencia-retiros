/**
 * Retorna la fecha actual en formato ISO YYYY-MM-DD (fecha del servidor/día actual)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna el nombre del día de la semana actual en español (ej. "Lunes", "Martes")
 */
export function getTodayDayName(): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[new Date().getDay()];
}

/**
 * Formatea una fecha a un formato legible en español
 * Ej: "Lunes, 28 de Septiembre de 2026"
 */
export function formatSpanishDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
