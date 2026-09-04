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
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('pendiente_entrevista');

    expect(applications.findAll).toHaveBeenCalledWith(
      { status: 'pendiente_entrevista' },
      { page: 1, pageSize: 25 },
    );
  });

  it('sin filtro, pide todas', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined);

    expect(applications.findAll).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 25 });
  });

  it('pagina con page y pageSize pedidos', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 120 });

    const result = await useCase.execute(undefined, 3, 50);

    expect(applications.findAll).toHaveBeenCalledWith(undefined, { page: 3, pageSize: 50 });
    expect(result).toEqual({ items: [], total: 120, page: 3, pageSize: 50 });
  });

  it('rechaza un pageSize fuera de lo permitido y cae al default (25)', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(undefined, 1, 999);

    expect(applications.findAll).toHaveBeenCalledWith(undefined, { page: 1, pageSize: 25 });
    expect(result.pageSize).toBe(25);
  });

  it('delega el término de búsqueda al repositorio', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, undefined, undefined, 'SOL-A8F3K2');

    expect(applications.findAll).toHaveBeenCalledWith(
      { status: undefined, search: 'SOL-A8F3K2' },
      { page: 1, pageSize: 25 },
    );
  });

  it('recorta espacios del término de búsqueda y lo ignora si queda vacío', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, undefined, undefined, '  Juan  ');
    expect(applications.findAll).toHaveBeenLastCalledWith(
      { status: undefined, search: 'Juan' },
      { page: 1, pageSize: 25 },
    );

    await useCase.execute(undefined, undefined, undefined, '   ');
    expect(applications.findAll).toHaveBeenLastCalledWith(undefined, { page: 1, pageSize: 25 });
  });

  it('combina status y búsqueda cuando vienen los dos', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('aceptada', undefined, undefined, 'Vargas');

    expect(applications.findAll).toHaveBeenCalledWith(
      { status: 'aceptada', search: 'Vargas' },
      { page: 1, pageSize: 25 },
    );
  });

  it('rechaza una page inválida (0, negativa o no entera) y cae a 1', async () => {
    applications.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, 0);
    expect(applications.findAll).toHaveBeenLastCalledWith(undefined, { page: 1, pageSize: 25 });

    await useCase.execute(undefined, -3);
    expect(applications.findAll).toHaveBeenLastCalledWith(undefined, { page: 1, pageSize: 25 });

    await useCase.execute(undefined, 1.5);
    expect(applications.findAll).toHaveBeenLastCalledWith(undefined, { page: 1, pageSize: 25 });
  });
});
