import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcceptAdmissionApplicationUseCase } from './accept-admission-application.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('AcceptAdmissionApplicationUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new AcceptAdmissionApplicationUseCase(applications, users);

  const build = (status: AdmissionStatus) =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1 # 2-3',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      status, 150000, '2026-01-02T00:00:00.000Z', '2026-01-05T10:00:00.000Z', 'Bien', null, null, null,
      '2026-01-01T00:00:00.000Z',
    );

  beforeEach(() => {
    jest.clearAllMocks();
    users.findByDocumentNumber.mockResolvedValue(null);
  });

  it('rechaza si la solicitud no existe', async () => {
    applications.findById.mockResolvedValue(null);

    await expect(useCase.execute('app-1')).rejects.toThrow(NotFoundException);
  });

  it('rechaza si no está pendiente_entrevista', async () => {
    applications.findById.mockResolvedValue(build('pendiente_pago'));

    await expect(useCase.execute('app-1')).rejects.toThrow(ConflictException);
  });

  it('aspirante nuevo (sin coincidencia de documento): matchedUserId null y prefill completo', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));
    users.findByDocumentNumber.mockResolvedValue(null);

    const result = await useCase.execute('app-1');

    expect(result.matchedUserId).toBeNull();
    expect(result.prefill).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez',
      birthDate: '2015-05-20',
      documentType: 'TI',
      documentNumber: '1098765432',
      address: 'Calle 1 # 2-3',
      gradeId: 'grade-1',
      academicYearId: 'year-2026',
    });
    expect(result.application.status).toBe('aceptada');
    expect(applications.save).toHaveBeenCalledTimes(1);
  });

  it('estudiante de regreso (coincide el documento): matchedUserId con el id del usuario existente', async () => {
    applications.findById.mockResolvedValue(build('pendiente_entrevista'));
    users.findByDocumentNumber.mockResolvedValue(
      new User('user-99', 'juan.viejo@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active'),
    );

    const result = await useCase.execute('app-1');

    expect(result.matchedUserId).toBe('user-99');
    expect(result.application.matchedUserId).toBe('user-99');
  });
});
