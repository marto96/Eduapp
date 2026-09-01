/**
 * Formatea un monto como pesos colombianos, con separador de miles — el
 * peso colombiano no se muestra con centavos en uso cotidiano, de ahí
 * `maximumFractionDigits: 0` (sin `minimumFractionDigits`, `Intl` lo toma
 * como 0 también).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
