export const ROLE_LABELS: Record<string, string> = {
  admin_institucion: 'Administrador',
  directivo: 'Directivo',
  secretaria: 'Secretaría',
  docente: 'Docente',
  estudiante: 'Estudiante',
  padre_tutor: 'Padre/Tutor',
};

export function formatRoles(roles: string[]): string {
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(', ');
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
