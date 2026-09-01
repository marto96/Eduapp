import type { DayOfWeek } from '@eduapp/shared-types';

/**
 * Fecha de hoy en `YYYY-MM-DD`, en la zona horaria local del navegador —
 * a diferencia de `new Date().toISOString().slice(0, 10)` (UTC), esto no
 * salta al día siguiente en horario nocturno en zonas UTC-negativas (ej.
 * Colombia UTC-5: a las 19:00 locales, `toISOString()` ya está en el día
 * siguiente en UTC).
 */
export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAYS_BY_INDEX: (DayOfWeek | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Día de la semana de hoy en el formato usado por `Schedule.dayOfWeek`
 * ('lunes'..'sabado'), o `null` los domingos (no hay horarios ese día).
 */
export function todayDayOfWeek(): DayOfWeek | null {
  return DAYS_BY_INDEX[new Date().getDay()];
}
