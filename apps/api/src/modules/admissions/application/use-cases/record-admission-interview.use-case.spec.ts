import { ConflictException, NotFoundException } from '@nestjs/common';
import { RecordAdmissionInterviewUseCase } from './record-admission-interview.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

describe('RecordAdmissionInterviewUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new RecordAdmissionInterviewUseCase(applications);

  const build = (status: 'pendiente_pago' | 'pendiente_entrevista' | 'aceptada' | 'rechazada') =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, null, null, null, null, null, null, '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('app-1', { interviewDate: '2026-02-01T10:00:00.000Z', interviewNotes: null }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si la solicitud no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('pendiente_pago'));

    await expect(
      useCase.execute('app-1', { interviewDate: '2026-02-01T10:00:00.000Z', interviewNotes: null }),
    ).rejects.toThrow(ConflictException);
  });

  it('registra fecha y notas', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));

    const result = await useCase.execute('app-1', {
      interviewDate: '2026-02-01T10:00:00.000Z',
      interviewNotes: 'Buena entrevista',
    });

    expect(result.interviewDate).toBe('2026-02-01T10:00:00.000Z');
    expect(result.interviewNotes).toBe('Buena entrevista');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });
});
