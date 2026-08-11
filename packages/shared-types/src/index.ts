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

export interface Subject {
  id: string;
  name: string;
  area: string;
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

export type EvaluationType = 'examen' | 'tarea' | 'proyecto' | 'otro';

export interface Evaluation {
  id: string;
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  period: string;
  type: EvaluationType;
  maxScore: number;
}

export interface GradeScore {
  id: string;
  evaluationId: string;
  enrollmentId: string;
  score: number;
}

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado';

export interface Schedule {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export type ChargeConcept = 'matricula' | 'pension' | 'otro';
export type ChargeStatus = 'pendiente' | 'parcial' | 'pagado' | 'anulado';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export interface Charge {
  id: string;
  enrollmentId: string;
  concept: ChargeConcept;
  description: string;
  amount: number;
  dueDate: string;
  discountAmount: number;
  editedAt: string | null;
  voidedAt: string | null;
  paidAmount: number;
  netAmount: number;
  balance: number;
  status: ChargeStatus;
}

export interface Payment {
  id: string;
  chargeId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference?: string;
  voidedAt: string | null;
}

export type ContractType = 'planta' | 'contrato' | 'suplente';
export type EmployeeStatus = 'activo' | 'inactivo';
export type LeaveType = 'vacaciones' | 'enfermedad' | 'personal' | 'otro';

export interface Employee {
  id: string;
  userId: string;
  position: string;
  contractType: ContractType;
  hireDate: string;
  status: EmployeeStatus;
  salary: number | null;
}

export interface Leave {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export type DocumentType =
  | 'constancia_matricula'
  | 'certificado_notas'
  | 'constancia_buena_conducta'
  | 'otro';

export interface IssuedDocument {
  id: string;
  enrollmentId: string;
  type: DocumentType;
  description: string;
  issuedAt: string;
  issuedBy: string;
  voidedAt: string | null;
}

export type GuardianLinkStatus = 'pending' | 'approved';

export interface GuardianLink {
  id: string;
  guardianUserId: string;
  studentUserId: string;
  status: GuardianLinkStatus;
}

export type AnnouncementCategory = 'comunicado' | 'circular' | 'aviso';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishedAt: string;
  publishedBy: string;
  sectionId: string | null;
  editedAt: string | null;
  voidedAt: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
  sectionId: string | null;
  editedAt: string | null;
  voidedAt: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  editedAt: string | null;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface Survey {
  id: string;
  questions: SurveyQuestion[];
  createdBy: string;
  createdAt: string;
  closesAt: string | null;
  editedAt: string | null;
  voidedAt: string | null;
}

export interface SurveyQuestionResult {
  questionId: string;
  text: string;
  options: string[];
  counts: Record<string, number>;
  myAnswer: string | null;
}

export interface SurveyResults {
  surveyId: string;
  closesAt: string | null;
  isClosed: boolean;
  voidedAt: string | null;
  totalRespondents: number;
  questions: SurveyQuestionResult[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  totalCopies: number;
}

export interface Loan {
  id: string;
  bookId: string;
  studentId: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
}
