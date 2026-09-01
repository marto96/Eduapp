import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admission_applications' })
export class AdmissionApplicationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tracking_code', unique: true })
  trackingCode: string;

  @Column({ name: 'student_first_name' })
  studentFirstName: string;

  @Column({ name: 'student_last_name' })
  studentLastName: string;

  @Column({ name: 'student_birth_date', type: 'date' })
  studentBirthDate: string;

  @Column({ name: 'student_document_type' })
  studentDocumentType: string;

  @Column({ name: 'student_document_number' })
  studentDocumentNumber: string;

  @Column({ name: 'student_address', type: 'text' })
  studentAddress: string;

  @Column({ name: 'grade_id' })
  gradeId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'guardian_name' })
  guardianName: string;

  @Column({ name: 'guardian_email' })
  guardianEmail: string;

  @Column({ name: 'guardian_phone' })
  guardianPhone: string;

  @Column()
  status: string;

  @Column({ name: 'fee_amount', type: 'real' })
  feeAmount: number;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'interview_date', type: 'timestamptz', nullable: true })
  interviewDate: Date | null;

  @Column({ name: 'interview_notes', type: 'text', nullable: true })
  interviewNotes: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'matched_user_id', type: 'uuid', nullable: true })
  matchedUserId: string | null;

  @Column({ name: 'resulting_enrollment_id', type: 'uuid', nullable: true })
  resultingEnrollmentId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
