import { NotFoundException } from '@nestjs/common';
import { GetAdmissionApplicationStatusUseCase } from './get-admission-application-status.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { Grade } from '../../../academic/domain/entities/grade.entity';

describe('GetAdmissionApplicationStatusUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };

  const useCase = new GetAdmissionApplicationStatusUseCase(applications, grades);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza con 404 genérico si el código no existe', async () => {
    applications.findByTrackingCode.mockResolvedValue(null);

    await expect(useCase.execute('SOL-INVALID')).rejects.toThrow(NotFoundException);
  });

  it('devuelve solo status, gradeName y createdAt — nada más', async () => {
    applications.findByTrackingCode.mockResolvedValue(
      new AdmissionApplication(
        'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
        'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
        'pendiente_entrevista', 150000, '2026-01-02T00:00:00.000Z', null, null, null, null, null,
        '2026-01-01T00:00:00.000Z',
      ),
    );
    grades.findById.mockResolvedValue(new Grade('grade-1', 'Sexto', 'Bachillerato', 7));

    const result = await useCase.execute('SOL-A8F3K2');

    expect(result).toEqual({
      status: 'pendiente_entrevista',
      gradeName: 'Sexto',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
