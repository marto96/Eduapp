import { ConflictException, NotFoundException } from '@nestjs/common';
import { RejectAdmissionApplicationUseCase } from './reject-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

describe('RejectAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new RejectAdmissionApplicationUseCase(applications);

  const build = (status: AdmissionStatus) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1', 'No cumple requisitos')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('aceptada'));

    await expect(useCase.execute('app-1', 'No cumple requisitos')).rejects.toThrow(ConflictException);
  });

  it('rechaza la solicitud y guarda el motivo', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    const result = await useCase.execute('app-1', 'No cumple requisitos de edad');

    expect(result.status).toBe('rechazada');
    expect(result.rejectionReason).toBe('No cumple requisitos de edad');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
