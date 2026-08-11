import type { DayOfWeek } from '@eduapp/shared-types';

const DAYS: (DayOfWeek | null)[] = [
  null, // domingo — el tipo DayOfWeek no lo incluye (sin clases)
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

/** `null` si es domingo (no hay clases ese día en el modelo de horarios). */
export function getTodayDayOfWeek(): DayOfWeek | null {
  return DAYS[new Date().getDay()];
}
