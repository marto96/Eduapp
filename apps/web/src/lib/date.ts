/**
 * Fecha de hoy en `YYYY-MM-DD`, en la zona horaria local del navegador —
 * a diferencia de `new Date().toISOString().slice(0, 10)` (UTC), esto no
 * salta al día siguiente en horario nocturno en zonas UTC-negativas (ej.
 * Argentina UTC-3: a las 21:00 locales, `toISOString()` ya está en el día
 * siguiente en UTC).
 */
export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
