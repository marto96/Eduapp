import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';
import { generateTrackingCode } from '../services/generate-tracking-code';

export interface CreateAdmissionApplicationInput {
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export interface CreateAdmissionApplicationOutput {
  trackingCode: string;
  checkoutUrl: string;
}

@Injectable()
export class CreateAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionPaymentAttemptRepositoryPort) private readonly attempts: AdmissionPaymentAttemptRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: CreateAdmissionApplicationInput): Promise<CreateAdmissionApplicationOutput> {
    const grade = await this.grades.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${input.gradeId}"`);
    }

    const years = await this.academicYears.findAll();
    const activeYear = years.find((y) => y.status === 'active');
    if (!activeYear) {
      throw new NotFoundException('No hay un año lectivo activo configurado');
    }

    const existingPending = await this.applications.findPendingByDocumentNumber(
      input.studentDocumentNumber,
    );
    if (existingPending) {
      throw new ConflictException('Ya existe una solicitud en curso para ese número de documento');
    }

    const feeSchedule = await this.feeSchedules.findOne(
      input.gradeId,
      activeYear.id,
      'solicitud_admision',
    );
    if (!feeSchedule) {
      throw new NotFoundException('No hay un precio de solicitud configurado para ese grado');
    }

    const application = new AdmissionApplication(
      randomUUID(),
      generateTrackingCode(),
      input.studentFirstName,
      input.studentLastName,
      input.studentBirthDate,
      input.studentDocumentType,
      input.studentDocumentNumber,
      input.studentAddress,
      input.gradeId,
      activeYear.id,
      input.guardianName,
      input.guardianEmail,
      input.guardianPhone,
      'pendiente_pago',
      feeSchedule.amount,
      null,
      null,
      null,
      null,
      null,
      null,
      new Date().toISOString(),
    );
    await this.applications.save(application);

    const attemptId = randomUUID();
    const { preferenceId, checkoutUrl } = await this.gateway.createCheckoutPreference({
      externalReference: attemptId,
      payerEmail: input.guardianEmail,
      item: { title: `Solicitud de admisión — ${grade.name}`, amount: feeSchedule.amount },
    });

    const attempt = new AdmissionPaymentAttempt(
      attemptId,
      application.id,
      preferenceId,
      feeSchedule.amount,
      'pending',
      new Date().toISOString(),
    );
    await this.attempts.save(attempt);

    return { trackingCode: application.trackingCode, checkoutUrl };
  }
}
