/**
 * Refleja en la UI las mismas reglas que evalúa CASL en el backend
 * (core/auth/casl/ability.factory.ts) — solo para ocultar acciones que van
 * a fallar, nunca como única barrera (la fuente de verdad es el backend).
 */
export function canManageAcademic(roles: string[]): boolean {
  return roles.includes('admin_institucion') || roles.includes('directivo');
}
