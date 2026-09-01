import { ConflictException, NotFoundException } from '@nestjs/common';
import { LinkAdmissionEnrollmentUseCase } from './link-admission-enrollment.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

describe('LinkAdmissionEnrollmentUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new LinkAdmissionEnrollmentUseCase(applications);

  const build = (status: AdmissionStatus, resultingEnrollmentId: string | null = null) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, resultingEnrollmentId, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está aceptada', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(ConflictException);
  });

  it('rechaza si ya tiene una matrícula enlazada', async () => {
    applications.findById.mockResolvedValue(build('aceptada', 'enr-viejo'));

    await expect(useCase.execute('app-1', 'enr-1')).rejects.toThrow(ConflictException);
  });

  it('enlaza la matrícula', async () => {
    applications.findById.mockResolvedValue(build('aceptada', null));

    const result = await useCase.execute('app-1', 'enr-1');

    expect(result.resultingEnrollmentId).toBe('enr-1');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
