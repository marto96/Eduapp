/**
 * Dos rangos [aStart,aEnd) y [bStart,bEnd) se superponen si cada uno
 * empieza antes de que el otro termine. Recibe fechas en formato
 * `YYYY-MM-DD`: la comparación lexicográfica de strings da el mismo orden
 * que la comparación cronológica para ese formato, sin pasar por `Date`.
 */
export function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
