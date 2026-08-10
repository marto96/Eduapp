// Tipos/DTOs compartidos entre apps/api y apps/web (y una futura app móvil).
// Ejemplo inicial; se amplía a medida que se implementan los módulos.

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
}

export interface Grade {
  id: string;
  name: string;
  level: string;
}

export interface Section {
  id: string;
  gradeId: string;
  name: string;
}

export interface TenantUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  status: 'active' | 'invited' | 'suspended';
}

export interface Enrollment {
  id: string;
  studentId: string;
  sectionId: string;
  academicYearId: string;
  status: 'active' | 'withdrawn' | 'completed';
}

export type AttendanceStatus = 'presente' | 'ausente' | 'tarde' | 'justificado';

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  date: string;
  status: AttendanceStatus;
}
