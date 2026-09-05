import { ListEnrollmentsUseCase } from './list-enrollments.use-case';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../services/enrollment-access.service';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('ListEnrollmentsUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const enrollmentAccess = {
    resolveAccessibleEnrollmentIds: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;

  const useCase = new ListEnrollmentsUseCase(enrollments, enrollmentAccess);

  const admin: JwtPayload = { sub: 'admin-1', email: 'admin@test.com', roles: ['admin_institucion'], tenantId: 't-1' };
  const student: JwtPayload = { sub: 'stu-1', email: 'stu@test.com', roles: ['estudiante'], tenantId: 't-1' };

  const e1 = new Enrollment('e-1', 'stu-1', 'sec-1', 'year-1', 'active');
  const e2 = new Enrollment('e-2', 'stu-2', 'sec-1', 'year-1', 'active');

  beforeEach(() => jest.clearAllMocks());

  it('sin page/pageSize devuelve el array completo cuando no hay restricción de acceso', async () => {
    enrollments.findAll.mockResolvedValue([e1, e2]);
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);

    const result = await useCase.execute(undefined, admin);

    expect(result).toEqual([e1, e2]);
    expect(enrollments.findAllPaginated).not.toHaveBeenCalled();
  });

  it('sin page/pageSize filtra en memoria según el acceso restringido', async () => {
    enrollments.findAll.mockResolvedValue([e1, e2]);
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['e-1']));

    const result = await useCase.execute(undefined, student);

    expect(result).toEqual([e1]);
  });

  it('con page/pageSize pagina en la DB cuando no hay restricción de acceso', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    enrollments.findAllPaginated.mockResolvedValue({ items: [e1], total: 2 });

    const result = await useCase.execute({ page: 1, pageSize: 25 }, admin);

    expect(result).toEqual({ items: [e1], total: 2, page: 1, pageSize: 25 });
    expect(enrollments.findAll).not.toHaveBeenCalled();
  });

  it('con page/pageSize y acceso restringido pagina en memoria manteniendo el total correcto', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['e-1']));
    enrollments.findAll.mockResolvedValue([e1, e2]);

    const result = await useCase.execute({ page: 1, pageSize: 25 }, student);

    expect(result).toEqual({ items: [e1], total: 1, page: 1, pageSize: 25 });
    expect(enrollments.findAllPaginated).not.toHaveBeenCalled();
  });

  it('recorta y trimea el término de búsqueda antes de pasarlo al filtro', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([]);

    await useCase.execute({ search: '  juan  ' }, admin);

    expect(enrollments.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'juan' }),
    );
  });
});
