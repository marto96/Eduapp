import { ListUsersUseCase } from './list-users.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';

describe('ListUsersUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListUsersUseCase(users);

  beforeEach(() => jest.clearAllMocks());

  it('sin page/pageSize, devuelve el array completo tal cual (compatibilidad con los selects existentes)', async () => {
    users.findAll.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute();

    expect(users.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([]);
  });

  it('sin page/pageSize, delega el filtro de rol igual, sin paginar', async () => {
    users.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('docente');

    expect(users.findAll).toHaveBeenCalledWith({ role: 'docente', search: undefined });
  });

  it('delega el término de búsqueda, recortado', async () => {
    users.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, undefined, undefined, '  Ana  ');

    expect(users.findAll).toHaveBeenCalledWith({ role: undefined, search: 'Ana' });
  });

  it('con page/pageSize, pagina y devuelve el envelope', async () => {
    users.findAll.mockResolvedValue({ items: [], total: 42 });

    const result = await useCase.execute(undefined, 2, 10);

    expect(users.findAll).toHaveBeenCalledWith(undefined, { page: 2, pageSize: 10 });
    expect(result).toEqual({ items: [], total: 42, page: 2, pageSize: 10 });
  });

  it('con page/pageSize, rechaza un pageSize fuera de lo permitido y cae al default', async () => {
    users.findAll.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(undefined, 1, 7);

    expect((result as { pageSize: number }).pageSize).toBe(25);
  });
});
