/**
 * Nombre de sala de Jitsi Meet derivado del `scheduleId` — determinístico
 * y sin persistir ningún link. Se incluye el `tenantId` para que dos
 * tenants nunca puedan colisionar en el mismo nombre de sala pública en
 * meet.jit.si.
 */
export function buildVirtualRoomName(tenantId: string, scheduleId: string): string {
  return `skolaria-${tenantId}-${scheduleId}`;
}
