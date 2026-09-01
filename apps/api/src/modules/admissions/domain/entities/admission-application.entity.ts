import { DocumentType } from '../../../identity/domain/entities/user.entity';

export type AdmissionStatus = 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada';

export class AdmissionApplication {
  constructor(
    public readonly id: string,
    public readonly trackingCode: string,
    public readonly studentFirstName: string,
    public readonly studentLastName: string,
    public readonly studentBirthDate: string,
    public readonly studentDocumentType: DocumentType,
    public readonly studentDocumentNumber: string,
    public readonly studentAddress: string,
    public readonly gradeId: string,
    public readonly academicYearId: string,
    public readonly guardianName: string,
    public readonly guardianEmail: string,
    public readonly guardianPhone: string,
    public status: AdmissionStatus,
    public readonly feeAmount: number,
    public paidAt: string | null,
    public interviewDate: string | null,
    public interviewNotes: string | null,
    public rejectionReason: string | null,
    public matchedUserId: string | null,
    public resultingEnrollmentId: string | null,
    public readonly createdAt: string,
  ) {}

  /** El webhook puede reintentar notificaciones — no debe duplicar el efecto. */
  markPaid(): void {
    if (this.status !== 'pendiente_pago') return;
    this.status = 'pendiente_entrevista';
    this.paidAt = new Date().toISOString();
  }

  recordInterview(date: string, notes: string | null): void {
    this.interviewDate = date;
    this.interviewNotes = notes;
  }

  accept(matchedUserId: string | null): void {
    this.status = 'aceptada';
    this.matchedUserId = matchedUserId;
  }

  reject(reason: string): void {
    this.status = 'rechazada';
    this.rejectionReason = reason;
  }

  linkEnrollment(enrollmentId: string): void {
    this.resultingEnrollmentId = enrollmentId;
  }
}
