import { ListDocumentsUseCase } from './list-documents.use-case';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('ListDocumentsUseCase', () => {
  const documents: jest.Mocked<IssuedDocumentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const enrollmentAccess = {
    resolveAccessibleEnrollmentIds: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;

  const useCase = new ListDocumentsUseCase(documents, enrollmentAccess);
  const staffUser = { sub: 'u-1', roles: ['secretaria'] } as JwtPayload;

  beforeEach(() => jest.clearAllMocks());

  it('sin page/pageSize y sin restricción de acceso, devuelve el array completo tal cual', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    documents.findAll.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(undefined, staffUser);

    expect(documents.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([]);
  });

  it('sin page/pageSize pero con acceso restringido, igual empuja enrollmentIds al filtro', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['e-1', 'e-2']));
    documents.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, staffUser);

    expect(documents.findAll).toHaveBeenCalledWith(
      { enrollmentId: undefined, type: undefined, search: undefined, enrollmentIds: expect.arrayContaining(['e-1', 'e-2']) },
    );
  });

  it('combina el enrollmentId pedido con la restricción de acceso', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['e-1', 'e-2']));
    documents.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ enrollmentId: 'e-1' }, staffUser);

    expect(documents.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentId: 'e-1', enrollmentIds: ['e-1', 'e-2'] }),
    );
  });

  it('delega el término de búsqueda, recortado', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    documents.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(undefined, staffUser, undefined, undefined, '  Perez  ');

    expect(documents.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'Perez' }));
  });

  it('con page y pageSize, pagina y devuelve el envelope', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    documents.findAll.mockResolvedValue({ items: [], total: 33 });

    const result = await useCase.execute(undefined, staffUser, 2, 10);

    expect(documents.findAll).toHaveBeenCalledWith(undefined, { page: 2, pageSize: 10 });
    expect(result).toEqual({ items: [], total: 33, page: 2, pageSize: 10 });
  });
});
