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

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
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
  order: number;
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

export interface Period {
  id: string;
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

export interface TenantUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: 'active' | 'invited' | 'suspended';
  birthDate: string | null;
  documentType: IdentityDocumentType | null;
  documentNumber: string | null;
  address: string | null;
}

export type EnrollmentStatus = 'active' | 'withdrawn' | 'completed';

export interface Enrollment {
  id: string;
  studentId: string;
  sectionId: string;
  academicYearId: string;
  status: EnrollmentStatus;
}

export type AuditLogKind = 'write' | 'sensitive_read';

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRoles: string[] | null;
  method: string;
  route: string;
  resourceId: string | null;
  statusCode: number | null;
  success: boolean;
  kind: AuditLogKind;
  ipAddress: string | null;
  createdAt: string;
}

export type AdmissionStatus = 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada';

/**
 * Tipo de documento de identidad (Registraduría Nacional de Colombia) —
 * distinto de `DocumentType` de más abajo, que identifica documentos
 * *emitidos* por el colegio (constancias, certificados). Mismo nombre que
 * ya usa el backend en `identity/domain/entities/user.entity.ts`.
 */
export type IdentityDocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PA';

export interface AdmissionApplication {
  id: string;
  trackingCode: string;
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: IdentityDocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  academicYearId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  status: AdmissionStatus;
  feeAmount: number;
  paidAt: string | null;
  interviewDate: string | null;
  interviewNotes: string | null;
  rejectionReason: string | null;
  matchedUserId: string | null;
  resultingEnrollmentId: string | null;
  createdAt: string;
}

export interface AdmissionStatusResponse {
  status: AdmissionStatus;
  gradeName: string;
  createdAt: string;
}

export interface AdmissionAcceptResponse {
  application: AdmissionApplication;
  matchedUserId: string | null;
  prefill: {
    firstName: string;
    lastName: string;
    birthDate: string;
    documentType: IdentityDocumentType;
    documentNumber: string;
    address: string;
    gradeId: string;
    academicYearId: string;
  };
}

export type AttendanceStatus = 'presente' | 'ausente' | 'tarde' | 'justificado';

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  scheduleId: string | null;
  date: string;
  status: AttendanceStatus;
}

export interface Evaluation {
  id: string;
  subjectId: string;
  sectionId: string;
  academicYearId: string;
  periodId: string;
  category: GradeCategory;
  maxScore: number;
  label: string | null;
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
  isVirtual: boolean;
}

export interface ClassCancellation {
  id: string;
  scheduleId: string;
  date: string;
  cancelledBy: string;
  reason: string | null;
}

export interface VirtualRoom {
  roomName: string;
  roomUrl: string;
}

export type ChargeConcept = 'matricula' | 'pension' | 'solicitud_admision' | 'otro';
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

export interface FeeSchedule {
  id: string;
  gradeId: string;
  academicYearId: string;
  concept: ChargeConcept;
  amount: number;
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
  pdfGeneratedAt: string | null;
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
  attachmentUrl: string | null;
  attachmentName: string | null;
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

export interface AnnouncementReader {
  userId: string;
  fullName: string;
  readAt: string;
}

export interface EnrollmentReportRow {
  sectionId: string;
  active: number;
  withdrawn: number;
  completed: number;
  total: number;
}

export interface AttendanceReportRow {
  sectionId: string;
  presente: number;
  ausente: number;
  tarde: number;
  justificado: number;
  total: number;
  attendanceRate: number;
}

export interface FinanceReportRow {
  month: string;
  concept: string;
  charged: number;
  collected: number;
  pending: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  importedAt: string;
  matchedPaymentId: string | null;
}

export interface PlatformTenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  schemaName: string;
  status: 'active' | 'suspended';
  enabledModules: string[];
  primaryColor: string | null;
  logoUrl: string | null;
}

export type GradeCategory = 'actividad' | 'evaluacion_bimestral' | 'disciplina';

export interface GradeWeightConfig {
  id: string;
  actividadWeight: number;
  evaluacionBimestralWeight: number;
  disciplinaWeight: number;
}

export interface GradebookStudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  documentNumber: string | null;
  sectionId: string;
  sectionName: string;
}

export interface GradebookPeriodColumn {
  id: string;
  name: string;
  order: number;
  weight: number;
}

export interface GradebookPeriodCell {
  periodId: string;
  grade: number | null;
  isPartial: boolean;
  absences: number;
}

export interface GradebookSubjectRow {
  subjectId: string;
  subjectName: string;
  periods: GradebookPeriodCell[];
  accumulatedGrade: number;
  accumulatedAbsences: number;
}

export interface GradebookResponse {
  enrollmentId: string;
  studentName: string;
  sectionName: string;
  academicYearName: string;
  periods: GradebookPeriodColumn[];
  subjects: GradebookSubjectRow[];
}

export interface GradebookCategoryItem {
  evaluationId: string;
  category: GradeCategory;
  label: string | null;
  maxScore: number;
  rawScore: number | null;
  normalized: number | null;
}

export interface GradebookCategoryBreakdown {
  category: GradeCategory;
  weight: number;
  average: number | null;
  items: GradebookCategoryItem[];
}

export interface SubjectPeriodDetailResponse {
  subjectId: string;
  subjectName: string;
  periodId: string;
  periodName: string;
  grade: number | null;
  isPartial: boolean;
  categories: GradebookCategoryBreakdown[];
}

export interface CreateGradeInput {
  subjectId: string;
  sectionId: string;
  periodId: string;
  category: GradeCategory;
  evaluationId?: string;
  label?: string;
  maxScore?: number;
  score: number;
}
