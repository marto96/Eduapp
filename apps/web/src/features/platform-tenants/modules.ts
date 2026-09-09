/** Mismo listado que `TENANT_MODULES` en `apps/api/src/core/database/tenant.datasource.ts`. */
export const AVAILABLE_MODULES = [
  'identity',
  'academic',
  'enrollment',
  'attendance',
  'grading',
  'schedule',
  'finance',
  'hr',
  'documents',
  'communication',
  'survey',
  'library',
];

/** Solo para mostrar en la UI — los valores enviados al backend son las claves en inglés de arriba. */
export const MODULE_LABELS: Record<string, string> = {
  identity: 'Identidad',
  academic: 'Académico',
  enrollment: 'Matrícula',
  attendance: 'Asistencia',
  grading: 'Calificaciones',
  schedule: 'Horario',
  finance: 'Finanzas',
  hr: 'Recursos humanos',
  documents: 'Documentos',
  communication: 'Comunicación',
  survey: 'Encuestas',
  library: 'Biblioteca',
};
