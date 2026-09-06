import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { AdmissionGradeClosureRepositoryPort } from '../ports/admission-grade-closure.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionPaymentAttempt } from '../../domain/entities/admission-payment-attempt.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';
import { generateTrackingCode } from '../services/generate-tracking-code';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface CreateAdmissionApplicationInput {
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentAddress: string;
  gradeId: string;
  academicYearId: string;
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
    @Inject(AdmissionGradeClosureRepositoryPort) private readonly gradeClosures: AdmissionGradeClosureRepositoryPort,
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

    const academicYear = await this.academicYears.findById(input.academicYearId);
    if (!academicYear || !academicYear.admissionsOpen) {
      throw new NotFoundException('El año lectivo seleccionado no está abierto para admisiones');
    }

    const gradeClosure = await this.gradeClosures.findByGradeAndYear(input.gradeId, academicYear.id);
    if (gradeClosure) {
      throw new ConflictException(
        `Ya no se reciben solicitudes para ${grade.name} en este año lectivo — cupo lleno`,
      );
    }

    const existingPending = await this.applications.findPendingByDocumentNumber(
      input.studentDocumentNumber,
    );
    if (existingPending) {
      throw new ConflictException('Ya existe una solicitud en curso para ese número de documento');
    }

    const feeSchedule = await this.feeSchedules.findOne(
      input.gradeId,
      academicYear.id,
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
      academicYear.id,
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
    try {
      await this.applications.save(application);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Ya existe una solicitud en curso para ese número de documento');
      }
      throw err;
    }

    const attemptId = randomUUID();
    const { preferenceId, checkoutUrl } = await this.gateway.createCheckoutPreference({
      externalReference: attemptId,
      payerEmail: input.guardianEmail,
      item: { title: `Solicitud de admisión — ${grade.name}`, amount: feeSchedule.amount },
      webhookPath: 'admissions/webhooks/payment',
      successPath: `admisiones/estado?code=${application.trackingCode}`,
      failurePath: `admisiones/estado?code=${application.trackingCode}`,
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
