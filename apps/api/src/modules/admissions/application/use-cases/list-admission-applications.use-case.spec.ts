import { ListAdmissionApplicationsUseCase } from './list-admission-applications.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';

describe('ListAdmissionApplicationsUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListAdmissionApplicationsUseCase(applications);

  beforeEach(() => jest.clearAllMocks());

  it('delega el filtro de status al repositorio', async () => {
    applications.findAll.mockResolvedValue([]);

    await useCase.execute('pendiente_entrevista');

    expect(applications.findAll).toHaveBeenCalledWith({ status: 'pendiente_entrevista' });
  });

  it('sin filtro, pide todas', async () => {
    applications.findAll.mockResolvedValue([]);

    await useCase.execute(undefined);

    expect(applications.findAll).toHaveBeenCalledWith(undefined);
  });
});
