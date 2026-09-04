import { ListGradebookStudentsUseCase } from './list-gradebook-students.use-case';
import { GradebookRepositoryPort } from '../ports/gradebook.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('ListGradebookStudentsUseCase', () => {
  const gradebook = { searchStudents: jest.fn() } as unknown as jest.Mocked<GradebookRepositoryPort>;
  const enrollmentAccess = { resolveAccessibleEnrollmentIds: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new ListGradebookStudentsUseCase(gradebook, enrollmentAccess);

  const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;
  const guardian: JwtPayload = { sub: 'guardian-1', roles: ['padre_tutor'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    gradebook.searchStudents.mockResolvedValue({ items: [], total: 0 });
  });

  it('cuando resolveAccessibleEnrollmentIds devuelve null (sin restricción), llama al repositorio con enrollmentIds undefined', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);

    await useCase.execute({ academicYearId: 'year-1', page: 1, pageSize: 20 }, admin);

    expect(gradebook.searchStudents).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentIds: undefined }),
    );
  });

  it('cuando resolveAccessibleEnrollmentIds devuelve un Set (padre_tutor), llama al repositorio con esos ids como array', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest
      .fn()
      .mockResolvedValue(new Set(['enr-1', 'enr-2']));

    await useCase.execute({ academicYearId: 'year-1', page: 1, pageSize: 20 }, guardian);

    const call = gradebook.searchStudents.mock.calls[0][0];
    expect(call.enrollmentIds).toEqual(expect.arrayContaining(['enr-1', 'enr-2']));
    expect(call.enrollmentIds).toHaveLength(2);
  });

  it('propaga la forma de PaginatedResult (page/pageSize/total/items) independientemente del scoping', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds = jest.fn().mockResolvedValue(null);
    gradebook.searchStudents.mockResolvedValue({
      items: [
        {
          enrollmentId: 'enr-1',
          studentId: 'student-1',
          fullName: 'Juan Pérez',
          documentNumber: '123',
          sectionId: 'section-1',
          sectionName: 'Sexto Uno',
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ academicYearId: 'year-1', page: 2, pageSize: 10 }, admin);

    expect(result).toEqual({
      items: [
        {
          enrollmentId: 'enr-1',
          studentId: 'student-1',
          fullName: 'Juan Pérez',
          documentNumber: '123',
          sectionId: 'section-1',
          sectionName: 'Sexto Uno',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
