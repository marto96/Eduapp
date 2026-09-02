import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateAdmissionApplicationUseCase } from './create-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionPaymentAttemptRepositoryPort } from '../ports/admission-payment-attempt.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeScheduleRepositoryPort } from '../../../finance/application/ports/fee-schedule.repository.port';
import { PaymentGatewayPort } from '../../../finance/application/ports/payment-gateway.port';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { FeeSchedule } from '../../../finance/domain/entities/fee-schedule.entity';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

describe('CreateAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const attempts: jest.Mocked<AdmissionPaymentAttemptRepositoryPort> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const feeSchedules: jest.Mocked<FeeScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createCheckoutPreference: jest.fn(),
    getPaymentInfo: jest.fn(),
  };

  const useCase = new CreateAdmissionApplicationUseCase(
    applications,
    attempts,
    grades,
    academicYears,
    feeSchedules,
    gateway,
  );

  const input = {
    studentFirstName: 'Juan',
    studentLastName: 'Pérez',
    studentBirthDate: '2015-05-20',
    studentDocumentType: 'TI' as const,
    studentDocumentNumber: '1098765432',
    studentAddress: 'Calle 1 # 2-3',
    gradeId: 'grade-1',
    guardianName: 'María Pérez',
    guardianEmail: 'maria@test.com',
    guardianPhone: '3001234567',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Sexto', 'Bachillerato', 7));
    academicYears.findAll.mockResolvedValue([
      new AcademicYear('year-2026', '2026', new Date('2026-01-01'), new Date('2026-12-15'), 'active'),
    ]);
    applications.findPendingByDocumentNumber.mockResolvedValue(null);
    feeSchedules.findOne.mockResolvedValue(
      new FeeSchedule('fs-1', 'grade-1', 'year-2026', 'solicitud_admision', 150000),
    );
    gateway.createCheckoutPreference.mockResolvedValue({
      preferenceId: 'pref-1',
      checkoutUrl: 'https://checkout.wompi.co/p/?reference=pref-1',
    });
  });

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('rechaza si no hay un año lectivo activo', async () => {
    academicYears.findAll.mockResolvedValue([
      new AcademicYear('year-2025', '2025', new Date('2025-01-01'), new Date('2025-12-15'), 'closed'),
    ]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si ya hay una solicitud en curso para ese documento', async () => {
    applications.findPendingByDocumentNumber.mockResolvedValue(
      new AdmissionApplication(
        'app-0', 'SOL-AAAAAA', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
        'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
        'pendiente_pago', 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
      ),
    );

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('rechaza si no hay precio configurado para ese grado', async () => {
    feeSchedules.findOne.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('crea la solicitud, arma el checkout, y devuelve trackingCode + checkoutUrl', async () => {
    const result = await useCase.execute(input);

    expect(result.checkoutUrl).toBe('https://checkout.wompi.co/p/?reference=pref-1');
    expect(result.trackingCode).toMatch(/^SOL-/);
    expect(applications.save).toHaveBeenCalledTimes(1);
    expect(attempts.save).toHaveBeenCalledTimes(1);

    const savedApplication = applications.save.mock.calls[0][0];
    expect(savedApplication.status).toBe('pendiente_pago');
    expect(savedApplication.feeAmount).toBe(150000);
    expect(savedApplication.academicYearId).toBe('year-2026');

    expect(gateway.createCheckoutPreference).toHaveBeenCalledWith({
      externalReference: expect.any(String),
      payerEmail: 'maria@test.com',
      item: { title: 'Solicitud de admisión — Sexto', amount: 150000 },
      webhookPath: 'admissions/webhooks/payment',
      successPath: `admisiones/estado?code=${result.trackingCode}`,
      failurePath: `admisiones/estado?code=${result.trackingCode}`,
    });
  });
});
