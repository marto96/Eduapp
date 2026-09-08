import { ForbiddenException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { GetGradebookUseCase, GradebookResponse } from '../../../grading/application/use-cases/get-gradebook.use-case';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import { ReportCardPdfGenerator } from '../../infrastructure/pdf/report-card-pdf-generator';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { GenerateReportCardPdfUseCase } from './generate-report-card-pdf.use-case';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

jest.mock('../../../../core/tenant/tenant-context', () => ({ getCurrentTenant: jest.fn() }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));

import { existsSync } from 'node:fs';

describe('GenerateReportCardPdfUseCase', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const getGradebook = { execute: jest.fn() } as unknown as jest.Mocked<GetGradebookUseCase>;
  const pdfGenerator = { generate: jest.fn() } as unknown as jest.Mocked<ReportCardPdfGenerator>;
  const tenantRegistry = { resolveByHost: jest.fn() } as unknown as jest.Mocked<TenantRegistryService>;

  const useCase = new GenerateReportCardPdfUseCase(enrollments, getGradebook, pdfGenerator, tenantRegistry);

  const input = { sectionId: 'section-1', academicYearId: 'year-1' };
  const currentUser: JwtPayload = { sub: 'admin-1', email: 'admin@test.com', roles: ['admin_institucion'], tenantId: 't1' };

  const baseGradebook: GradebookResponse = {
    enrollmentId: 'enr-1',
    studentName: 'Juan Pérez',
    sectionName: 'Sexto Uno',
    academicYearName: '2026',
    periods: [
      { id: 'p1', name: 'Primer periodo', order: 1, weight: 0.5 },
      { id: 'p2', name: 'Segundo periodo', order: 2, weight: 0.5 },
    ],
    subjects: [
      {
        subjectId: 'subj-1',
        subjectName: 'Matemática',
        subjectArea: 'Ciencias',
        periods: [
          { periodId: 'p1', grade: 3.8, isPartial: false, isRecovered: false, absences: 0 },
          { periodId: 'p2', grade: 4.0, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 3.9,
        accumulatedAbsences: 0,
      },
      {
        subjectId: 'subj-2',
        subjectName: 'Física',
        subjectArea: 'Ciencias',
        periods: [
          { periodId: 'p1', grade: 3.4, isPartial: false, isRecovered: true, absences: 0 },
          { periodId: 'p2', grade: null, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 1.7,
        accumulatedAbsences: 0,
      },
      {
        subjectId: 'subj-3',
        subjectName: 'Educación Física',
        subjectArea: '',
        periods: [
          { periodId: 'p1', grade: null, isPartial: false, isRecovered: false, absences: 0 },
          { periodId: 'p2', grade: null, isPartial: false, isRecovered: false, absences: 0 },
        ],
        accumulatedGrade: 0,
        accumulatedAbsences: 0,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentTenant as jest.Mock).mockReturnValue({ subdomain: 'colegio-demo' });
    enrollments.findAll.mockResolvedValue([new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active')]);
    getGradebook.execute.mockResolvedValue(baseGradebook);
    tenantRegistry.resolveByHost.mockResolvedValue({
      id: 't-1',
      name: 'Colegio Demo',
      subdomain: 'colegio-demo',
      customDomain: null,
      schemaName: 'tenant_colegio_demo',
      status: 'active',
      enabledModules: [],
      primaryColor: '#1f8a5c',
      logoUrl: null,
    });
    (existsSync as jest.Mock).mockReturnValue(false);
    pdfGenerator.generate.mockResolvedValue(Buffer.from(''));
  });

  it('pasa currentUser a GetGradebookUseCase por cada matrícula objetivo', async () => {
    await useCase.execute(input, currentUser);

    expect(getGradebook.execute).toHaveBeenCalledWith('enr-1', currentUser);
  });

  it('agrupa las materias por área con una columna por periodo', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const student = call.students[0];
    expect(student.periods).toEqual([
      { periodId: 'p1', periodName: 'Primer periodo' },
      { periodId: 'p2', periodName: 'Segundo periodo' },
    ]);

    const ciencias = student.areas.find((a: { areaName: string }) => a.areaName === 'Ciencias')!;
    expect(ciencias.subjects).toHaveLength(2);
    const fisica = ciencias.subjects.find((s: { subjectName: string }) => s.subjectName === 'Física')!;
    expect(fisica.gradeByPeriodId).toEqual({ p1: 3.4, p2: null });
    expect(fisica.recoveredPeriodIds.has('p1')).toBe(true);
    expect(fisica.recoveredPeriodIds.has('p2')).toBe(false);
  });

  it('calcula el promedio de área excluyendo materias sin nota en esa columna', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const ciencias = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Ciencias')!;
    // p1: (3.8 + 3.4) / 2 = 3.6 ; p2: solo Matemática tiene nota -> 4.0
    expect(ciencias.averageByPeriodId.p1).toBeCloseTo(3.6, 5);
    expect(ciencias.averageByPeriodId.p2).toBeCloseTo(4.0, 5);
  });

  it('una materia sin área configurada cae en "Sin área"', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const sinArea = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Sin área')!;
    expect(sinArea.subjects).toHaveLength(1);
    expect(sinArea.subjects[0].subjectName).toBe('Educación Física');
  });

  it('una materia sin ninguna nota en ningún periodo tiene finalGrade null y no arrastra el promedio de área a 0', async () => {
    await useCase.execute(input, currentUser);

    const call = pdfGenerator.generate.mock.calls[0][0];
    const sinArea = call.students[0].areas.find((a: { areaName: string }) => a.areaName === 'Sin área')!;
    expect(sinArea.subjects[0].finalGrade).toBeNull();
    expect(sinArea.finalAverage).toBeNull();
  });

  it('propaga el ForbiddenException de GetGradebookUseCase cuando el docente no tiene acceso a la sección', async () => {
    getGradebook.execute.mockRejectedValue(new ForbiddenException('No tenés acceso'));

    await expect(useCase.execute(input, currentUser)).rejects.toThrow(ForbiddenException);
  });

  it('pasa el color institucional del tenant al generador (regresión)', async () => {
    await useCase.execute(input, currentUser);

    expect(pdfGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ institutionColor: '#1f8a5c', institutionLogoPath: null }),
    );
  });
});
