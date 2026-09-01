/**
 * Refleja en la UI las mismas reglas que evalúa CASL en el backend
 * (core/auth/casl/ability.factory.ts) — solo para ocultar acciones que van
 * a fallar, nunca como única barrera (la fuente de verdad es el backend).
 */
export function canManageAcademic(roles: string[]): boolean {
  return roles.includes('admin_institucion') || roles.includes('directivo');
}

/** Reportes institucionales (matrícula/asistencia/finanzas) — datos sensibles a nivel institución. */
export function canViewReports(roles: string[]): boolean {
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

/** Mismo criterio que `canRecordAttendance`: calificar es tarea del docente. */
export function canManageGrading(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('docente')
  );
}

/**
 * A diferencia de `canManageAcademic`: acá `secretaria` también puede (cargar
 * cargos y registrar pagos es su tarea administrativa diaria, no exclusiva
 * de dirección). Ver `AbilityFactory` en el backend — misma regla.
 */
export function canManageFinance(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/**
 * A diferencia de todos los demás módulos: acá no hay un "puede leer pero
 * no gestionar" intermedio — `Hr` no está en el bloque de lectura
 * compartido del backend (ver `AbilityFactory`), así que quien no cumple
 * esto no tiene ningún acceso, ni de lectura. Mismos roles que
 * `canManageFinance`.
 */
export function canManageHr(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageFinance`: emitir documentos es tarea de secretaría. */
export function canManageDocuments(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageDocuments`: publicar comunicados es tarea de secretaría. */
export function canManageAnnouncements(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageAnnouncements`: cargar eventos institucionales es tarea de secretaría. */
export function canManageEvents(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageEvents`: crear encuestas es tarea administrativa (responderlas es para todos). */
export function canManageSurveys(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageDocuments`: cargar libros y gestionar préstamos es tarea de secretaría. */
export function canManageLibrary(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}

/** Mismo criterio que `canManageFinance`: gestionar solicitudes de admisión es tarea de secretaría. */
export function canManageAdmissions(roles: string[]): boolean {
  return (
    roles.includes('admin_institucion') || roles.includes('directivo') || roles.includes('secretaria')
  );
}
