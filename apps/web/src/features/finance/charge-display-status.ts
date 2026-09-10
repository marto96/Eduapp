import type { Charge } from '@eduapp/shared-types';

/**
 * "Vencido" no es un status que exista en la base — es un dato derivado
 * acá: un cargo pendiente/parcial cuya fecha de vencimiento ya pasó.
 * Compartido entre la gráfica de pagos y la lista de cargos del portal de
 * familia para que ambas vistas nunca queden inconsistentes entre sí.
 */
export type ChargeDisplayStatus = 'pagado' | 'pendiente' | 'vencido' | 'parcial' | 'anulado';

export function chargeDisplayStatus(charge: Charge): ChargeDisplayStatus {
  if (charge.status === 'pagado' || charge.status === 'anulado') return charge.status;
  const today = new Date().toISOString().slice(0, 10);
  if (charge.dueDate < today) return 'vencido';
  return charge.status;
}

export const CHARGE_DISPLAY_STATUS_LABELS: Record<ChargeDisplayStatus, string> = {
  pagado: 'pagado',
  pendiente: 'pendiente',
  parcial: 'parcial',
  vencido: 'vencido',
  anulado: 'anulado',
};

export const CHARGE_DISPLAY_STATUS_CLASSES: Record<ChargeDisplayStatus, string> = {
  pagado: 'text-muted-foreground',
  pendiente: 'text-foreground',
  parcial: 'text-foreground',
  vencido: 'text-destructive',
  anulado: 'text-muted-foreground',
};
