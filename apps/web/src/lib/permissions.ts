/**
 * Refleja en la UI las mismas reglas que evalúa CASL en el backend
 * (core/auth/casl/ability.factory.ts) — solo para ocultar acciones que van
 * a fallar, nunca como única barrera (la fuente de verdad es el backend).
 */
export function canManageAcademic(roles: string[]): boolean {
  return roles.includes('admin_institucion') || roles.includes('directivo');
}

export function canManageUsers(roles: string[]): boolean {
  return roles.includes('admin_institucion') || roles.includes('directivo');
}

export function canManageEnrollment(roles: string[]): boolean {
  return roles.includes('admin_institucion') || roles.includes('directivo');
}

/**
 * A diferencia del resto: acá `docente` también puede (tomar asistencia es
 * su tarea diaria), no solo admin/directivo. Ver `AbilityFactory` en el
 * backend — misma regla, reflejada acá.
 */
export function canRecordAttendance(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('docente')
  );
}
