# Reparto Automático de Estudiantes Entre Cursos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repartir automáticamente a los estudiantes matriculados de un grado entre los cursos destino (ej. 901/902), balanceando por promedio del año anterior, antigüedad y tamaño parejo — con reparto en zigzag por promedio descendente — dejando el ajuste manual posterior a la reasignación de sección que ya existe.

**Architecture:** Todo el trabajo nuevo vive en el módulo `grading` (NestJS/hexagonal), no en `enrollment`, para evitar un ciclo de dependencias: `GradingModule` ya importa `EnrollmentModule` (para reportes/boletines), así que si `EnrollmentModule` importara `GradingModule` de vuelta sería circular. `GradingModule` ya tiene acceso a todos los puertos necesarios (`EnrollmentRepositoryPort`, `GradeRepositoryPort`, `SectionRepositoryPort`, `AcademicYearRepositoryPort`, `PeriodRepositoryPort`, `UserRepositoryPort`) vía sus imports existentes — cero módulos nuevos que registrar.

**Tech Stack:** NestJS (hexagonal: domain/application/infrastructure/interface), TypeORM, Jest, Next.js App Router + TanStack Query, TypeScript en ambos lados vía `@eduapp/shared-types`.

**Spec:** `docs/superpowers/specs/2026-09-05-section-distribution-design.md`

## Global Constraints

- El reparto se **aplica directamente** al guardar — no hay vista previa editable separada (spec, sección "Alcance").
- Balance por género queda **fuera de alcance** en esta versión (spec, "Opciones consideradas").
- Se necesitan **al menos 2 secciones destino**; con menos, se rechaza.
- Una materia sin ninguna nota cargada para la matrícula del año anterior **no cuenta como 0** en el promedio — se excluye del cálculo (decisión tomada durante este plan, ver Tarea 2: `computeAccumulatedGrade` existente sí trata período sin nota como 0, comportamiento correcto para boletines pero no para este promedio comparativo).
- Todo el código nuevo va en `apps/api/src/modules/grading/` (domain/application/interface), nunca en `apps/api/src/modules/enrollment/` — ver "Architecture" arriba.

---

### Task 1: Servicio de dominio — mediana y reparto en zigzag

**Files:**
- Create: `apps/api/src/modules/grading/domain/services/section-distribution.service.ts`
- Test: `apps/api/src/modules/grading/domain/services/section-distribution.service.spec.ts`

**Interfaces:**
- Consumes: nada (funciones puras, sin dependencias).
- Produces: `SectionDistributionService.median(values: number[]): number` y
  `SectionDistributionService.zigzagDistribute(students: DistributableStudent[], groupCount: number): string[][]`
  (el índice `i` del array devuelto corresponde al `i`-ésimo elemento de la
  lista de secciones destino que reciba el llamador — mismo orden, no hay
  ids de sección acá). `DistributableStudent = { enrollmentId: string; average: number }`.
  La Tarea 3 consume ambas funciones y ese tipo.

- [ ] **Step 1: Escribir los tests**

```typescript
// apps/api/src/modules/grading/domain/services/section-distribution.service.spec.ts
import { SectionDistributionService } from './section-distribution.service';

describe('SectionDistributionService', () => {
  describe('median', () => {
    it('devuelve 0 para una lista vacía', () => {
      expect(SectionDistributionService.median([])).toBe(0);
    });

    it('devuelve el valor central para una cantidad impar', () => {
      expect(SectionDistributionService.median([3, 1, 2])).toBe(2);
    });

    it('devuelve el promedio de los dos centrales para una cantidad par', () => {
      expect(SectionDistributionService.median([4, 1, 3, 2])).toBe(2.5);
    });
  });

  describe('zigzagDistribute', () => {
    it('reparte 4 estudiantes en 2 grupos balanceando la suma de promedios', () => {
      const students = [
        { enrollmentId: 'e1', average: 90 },
        { enrollmentId: 'e2', average: 80 },
        { enrollmentId: 'e3', average: 70 },
        { enrollmentId: 'e4', average: 60 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups).toEqual([
        ['e1', 'e4'],
        ['e2', 'e3'],
      ]);
    });

    it('con cantidad impar, el grupo sobrante queda en el primer grupo del zigzag', () => {
      const students = [
        { enrollmentId: 'e1', average: 95 },
        { enrollmentId: 'e2', average: 85 },
        { enrollmentId: 'e3', average: 75 },
        { enrollmentId: 'e4', average: 65 },
        { enrollmentId: 'e5', average: 55 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups[0]).toEqual(['e1', 'e4', 'e5']);
      expect(groups[1]).toEqual(['e2', 'e3']);
    });

    it('mantiene el tamaño parejo aunque todos los promedios sean iguales', () => {
      const students = [
        { enrollmentId: 'e1', average: 75 },
        { enrollmentId: 'e2', average: 75 },
        { enrollmentId: 'e3', average: 75 },
        { enrollmentId: 'e4', average: 75 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups[0]).toHaveLength(2);
      expect(groups[1]).toHaveLength(2);
    });

    it('funciona con 3 o más grupos destino', () => {
      const students = [
        { enrollmentId: 'e1', average: 90 },
        { enrollmentId: 'e2', average: 80 },
        { enrollmentId: 'e3', average: 70 },
        { enrollmentId: 'e4', average: 60 },
        { enrollmentId: 'e5', average: 50 },
        { enrollmentId: 'e6', average: 40 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 3);

      expect(groups).toHaveLength(3);
      expect(groups.flat().sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
      groups.forEach((group) => expect(group).toHaveLength(2));
    });
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest section-distribution.service -v`
Expected: FAIL — `Cannot find module './section-distribution.service'`

- [ ] **Step 3: Implementar**

```typescript
// apps/api/src/modules/grading/domain/services/section-distribution.service.ts
export interface DistributableStudent {
  enrollmentId: string;
  average: number;
}

export class SectionDistributionService {
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Reparte en "serpiente" (snake draft): ordena por promedio descendente y
   * alterna la dirección de asignación cada `groupCount` estudiantes, para
   * que la suma de promedios quede lo más pareja posible entre grupos.
   */
  static zigzagDistribute(students: DistributableStudent[], groupCount: number): string[][] {
    const sorted = [...students].sort((a, b) => b.average - a.average);
    const groups: string[][] = Array.from({ length: groupCount }, () => []);

    sorted.forEach((student, index) => {
      const round = Math.floor(index / groupCount);
      const posInRound = index % groupCount;
      const groupIndex = round % 2 === 0 ? posInRound : groupCount - 1 - posInRound;
      groups[groupIndex].push(student.enrollmentId);
    });

    return groups;
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest section-distribution.service -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/grading/domain/services/section-distribution.service.ts apps/api/src/modules/grading/domain/services/section-distribution.service.spec.ts
git commit -m "feat(grading): agregar mediana y reparto en zigzag para distribución de secciones"
```

---

### Task 2: `StudentYearAverageService` — promedio anual de un estudiante

**Files:**
- Create: `apps/api/src/modules/grading/application/services/student-year-average.service.ts`
- Test: `apps/api/src/modules/grading/application/services/student-year-average.service.spec.ts`

**Interfaces:**
- Consumes: `EnrollmentRepositoryPort` (`apps/api/src/modules/enrollment/application/ports/enrollment.repository.port.ts`, método `findById(id): Promise<Enrollment | null>`), `EvaluationRepositoryPort`/`GradeScoreRepositoryPort`/`PeriodRepositoryPort` (ya existentes en `grading`/`academic`, ver arriba), `GradeWeightConfigService.getOrCreateDefault(): Promise<GradeWeightConfig>` (`apps/api/src/modules/grading/application/services/grade-weight-config.service.ts`), y `GradeCalculationService.computeSubjectPeriodGrade`/`computeAccumulatedGrade` (`apps/api/src/modules/grading/domain/services/grade-calculation.service.ts`, ya existentes, no se tocan).
- Produces: `StudentYearAverageService.compute(enrollmentId: string): Promise<number | null>` — la Tarea 3 lo inyecta y lo llama una vez por estudiante "antiguo".

- [ ] **Step 1: Escribir los tests**

```typescript
// apps/api/src/modules/grading/application/services/student-year-average.service.spec.ts
import { StudentYearAverageService } from './student-year-average.service';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { GradeWeightConfigService } from './grade-weight-config.service';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { Period } from '../../../academic/domain/entities/period.entity';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';

describe('StudentYearAverageService', () => {
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const evaluations: jest.Mocked<EvaluationRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const scores: jest.Mocked<GradeScoreRepositoryPort> = {
    findAll: jest.fn(),
    upsertMany: jest.fn(),
  };
  const periods: jest.Mocked<PeriodRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const weightConfigService = {
    getOrCreateDefault: jest.fn(),
  } as unknown as jest.Mocked<GradeWeightConfigService>;

  const service = new StudentYearAverageService(enrollments, evaluations, scores, periods, weightConfigService);

  const enrollment = new Enrollment('enr-1', 'student-1', 'section-1', 'year-2025', 'completed');
  const weightConfig = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
  const period = new Period('period-1', 'year-2025', 'Primer periodo', 1, 1, '2025-01-01', '2025-06-30');

  beforeEach(() => {
    jest.clearAllMocks();
    enrollments.findById.mockResolvedValue(enrollment);
    periods.findAll.mockResolvedValue([period]);
    weightConfigService.getOrCreateDefault.mockResolvedValue(weightConfig);
  });

  it('devuelve null si la matrícula no existe', async () => {
    enrollments.findById.mockResolvedValue(null);

    await expect(service.compute('enr-1')).resolves.toBeNull();
  });

  it('devuelve null si no hay ninguna nota cargada', async () => {
    scores.findAll.mockResolvedValue([]);
    evaluations.findAll.mockResolvedValue([]);

    await expect(service.compute('enr-1')).resolves.toBeNull();
  });

  it('calcula el promedio de una sola materia con las 3 categorías cargadas', async () => {
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-act', 'subj-mat', 'section-1', 'year-2025', 'period-1', 'actividad', 5, null),
      new Evaluation('eval-bim', 'subj-mat', 'section-1', 'year-2025', 'period-1', 'evaluacion_bimestral', 5, null),
      new Evaluation('eval-disc', 'subj-mat', 'section-1', 'year-2025', 'period-1', 'disciplina', 5, null),
    ]);
    scores.findAll.mockResolvedValue([
      new GradeScore('score-1', 'eval-act', 'enr-1', 5),
      new GradeScore('score-2', 'eval-bim', 'enr-1', 4),
      new GradeScore('score-3', 'eval-disc', 'enr-1', 3),
    ]);

    // 5*0.65 + 4*0.25 + 3*0.10 = 3.25 + 1 + 0.3 = 4.55, único periodo con peso 1 -> igual al acumulado
    await expect(service.compute('enr-1')).resolves.toBeCloseTo(4.55, 5);
  });

  it('promedia entre varias materias', async () => {
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-mat', 'subj-mat', 'section-1', 'year-2025', 'period-1', 'actividad', 5, null),
      new Evaluation('eval-esp', 'subj-esp', 'section-1', 'year-2025', 'period-1', 'actividad', 5, null),
    ]);
    scores.findAll.mockResolvedValue([
      new GradeScore('score-1', 'eval-mat', 'enr-1', 5),
      new GradeScore('score-2', 'eval-esp', 'enr-1', 3),
    ]);

    // Matemáticas: solo actividad cargada -> grade = 5 (única categoría con datos, se usa sola)
    // Español: solo actividad cargada -> grade = 3
    // Promedio entre materias: (5 + 3) / 2 = 4
    await expect(service.compute('enr-1')).resolves.toBeCloseTo(4, 5);
  });

  it('excluye una materia sin ninguna nota cargada, en vez de contarla como 0', async () => {
    evaluations.findAll.mockResolvedValue([
      new Evaluation('eval-mat', 'subj-mat', 'section-1', 'year-2025', 'period-1', 'actividad', 5, null),
      new Evaluation('eval-esp', 'subj-esp', 'section-1', 'year-2025', 'period-1', 'actividad', 5, null),
    ]);
    // Solo hay nota de Matemáticas -> Español no tiene ningún GradeScore
    scores.findAll.mockResolvedValue([new GradeScore('score-1', 'eval-mat', 'enr-1', 5)]);

    // Si Español contara como 0, el promedio sería (5+0)/2=2.5. Debe ser 5 (solo Matemáticas cuenta).
    await expect(service.compute('enr-1')).resolves.toBeCloseTo(5, 5);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest student-year-average.service -v`
Expected: FAIL — `Cannot find module './student-year-average.service'`

- [ ] **Step 3: Implementar**

```typescript
// apps/api/src/modules/grading/application/services/student-year-average.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EvaluationRepositoryPort } from '../ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../ports/grade-score.repository.port';
import { PeriodRepositoryPort } from '../../../academic/application/ports/period.repository.port';
import { GradeWeightConfigService } from './grade-weight-config.service';
import {
  EvaluationItem,
  GradeCalculationService,
  PeriodGradeInput,
} from '../../domain/services/grade-calculation.service';

@Injectable()
export class StudentYearAverageService {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort,
    private readonly weightConfigService: GradeWeightConfigService,
  ) {}

  /**
   * Promedio general de una matrícula, agregando todas sus materias. Una
   * materia sin ninguna nota cargada no cuenta como 0 — se excluye del
   * promedio (a diferencia de `computeAccumulatedGrade`, que sí trata un
   * periodo sin nota como 0 para el boletín en vivo; acá el promedio es
   * comparativo entre estudiantes, no una alerta de "falta nota").
   */
  async compute(enrollmentId: string): Promise<number | null> {
    const enrollment = await this.enrollments.findById(enrollmentId);
    if (!enrollment) return null;

    const [gradeScores, sectionEvaluations, periods, weightConfig] = await Promise.all([
      this.scores.findAll({ enrollmentId }),
      this.evaluations.findAll({ sectionId: enrollment.sectionId, academicYearId: enrollment.academicYearId }),
      this.periods.findAll({ academicYearId: enrollment.academicYearId }),
      this.weightConfigService.getOrCreateDefault(),
    ]);

    if (gradeScores.length === 0) return null;

    const scoreByEvaluationId = new Map(gradeScores.map((s) => [s.evaluationId, s.score]));
    const periodWeightById = new Map(periods.map((p) => [p.id, p.weight]));

    const bySubject = new Map<string, Map<string, EvaluationItem[]>>();
    for (const evaluation of sectionEvaluations) {
      if (!bySubject.has(evaluation.subjectId)) bySubject.set(evaluation.subjectId, new Map());
      const byPeriod = bySubject.get(evaluation.subjectId)!;
      if (!byPeriod.has(evaluation.periodId)) byPeriod.set(evaluation.periodId, []);
      byPeriod.get(evaluation.periodId)!.push({
        evaluationId: evaluation.id,
        category: evaluation.category,
        label: evaluation.label,
        maxScore: evaluation.maxScore,
        rawScore: scoreByEvaluationId.get(evaluation.id) ?? null,
      });
    }

    const subjectAverages: number[] = [];
    for (const byPeriod of bySubject.values()) {
      const periodGrades: PeriodGradeInput[] = [];
      for (const [periodId, items] of byPeriod) {
        const { grade } = GradeCalculationService.computeSubjectPeriodGrade(items, weightConfig);
        if (grade !== null) {
          periodGrades.push({ weight: periodWeightById.get(periodId) ?? 0, grade });
        }
      }
      if (periodGrades.length === 0) continue;
      subjectAverages.push(GradeCalculationService.computeAccumulatedGrade(periodGrades));
    }

    if (subjectAverages.length === 0) return null;
    return subjectAverages.reduce((sum, g) => sum + g, 0) / subjectAverages.length;
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest student-year-average.service -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/grading/application/services/student-year-average.service.ts apps/api/src/modules/grading/application/services/student-year-average.service.spec.ts
git commit -m "feat(grading): agregar StudentYearAverageService para el promedio anual de un estudiante"
```

---

### Task 3: `DistributeGradeIntoSectionsUseCase`

**Files:**
- Create: `apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.ts`
- Test: `apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.spec.ts`

**Interfaces:**
- Consumes: `SectionDistributionService.median`/`zigzagDistribute` (Tarea 1), `StudentYearAverageService.compute` (Tarea 2), `GradeRepositoryPort.findById` (`apps/api/src/modules/academic/application/ports/grade.repository.port.ts`), `SectionRepositoryPort.findAll` (`apps/api/src/modules/academic/application/ports/section.repository.port.ts`), `AcademicYearRepositoryPort.findById`/`findAll` (`apps/api/src/modules/academic/application/ports/academic-year.repository.port.ts` — `AcademicYear` ya expone `startDate: string`), `EnrollmentRepositoryPort.findAll`/`save` (Tarea 2, mismo puerto), `UserRepositoryPort.findById` (`apps/api/src/modules/identity/application/ports/user.repository.port.ts`, `User.fullName` es un getter ya existente).
- Produces: `DistributeGradeIntoSectionsInput { gradeId: string; academicYearId: string; sectionIds: string[] }`, `DistributeGradeIntoSectionsResultRow { studentId, studentName, enrollmentId, previousSectionId, previousSectionName, newSectionId, newSectionName, average: number | null, isReturning: boolean }`, y `DistributeGradeIntoSectionsUseCase.execute(input): Promise<DistributeGradeIntoSectionsResultRow[]>` — la Tarea 4 lo inyecta en el controller.

- [ ] **Step 1: Escribir los tests**

```typescript
// apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.spec.ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DistributeGradeIntoSectionsUseCase } from './distribute-grade-into-sections.use-case';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { StudentYearAverageService } from '../services/student-year-average.service';
import { Grade } from '../../../academic/domain/entities/grade.entity';
import { Section } from '../../../academic/domain/entities/section.entity';
import { AcademicYear } from '../../../academic/domain/entities/academic-year.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('DistributeGradeIntoSectionsUseCase', () => {
  const grades: jest.Mocked<GradeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const sections: jest.Mocked<SectionRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
    hasEnrollments: jest.fn(),
  };
  const academicYears: jest.Mocked<AcademicYearRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const studentYearAverage = { compute: jest.fn() } as unknown as jest.Mocked<StudentYearAverageService>;

  const useCase = new DistributeGradeIntoSectionsUseCase(
    grades,
    sections,
    academicYears,
    enrollments,
    users,
    studentYearAverage,
  );

  const grade = new Grade('grade-noveno', 'Noveno', 'Bachillerato', 9);
  const section901 = new Section('section-901', 'grade-noveno', '901');
  const section902 = new Section('section-902', 'grade-noveno', '902');
  const year2026 = new AcademicYear('year-2026', '2026', '2026-01-01', '2026-12-15', 'active', true);
  const year2025 = new AcademicYear('year-2025', '2025', '2025-01-01', '2025-12-15', 'closed', false);

  const input = { gradeId: 'grade-noveno', academicYearId: 'year-2026', sectionIds: ['section-901', 'section-902'] };

  beforeEach(() => {
    jest.clearAllMocks();
    grades.findById.mockResolvedValue(grade);
    academicYears.findById.mockResolvedValue(year2026);
    academicYears.findAll.mockResolvedValue([year2025, year2026]);
    sections.findAll.mockResolvedValue([section901, section902]);
    users.findById.mockImplementation(async (id: string) =>
      new User(id, `${id}@test.com`, 'hash', 'Nombre', 'Apellido', ['estudiante'], 'active'),
    );
  });

  it('rechaza con menos de 2 secciones destino', async () => {
    await expect(
      useCase.execute({ ...input, sectionIds: ['section-901'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si el grado no existe', async () => {
    grades.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el año lectivo no existe', async () => {
    academicYears.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si una sección destino no existe', async () => {
    sections.findAll.mockResolvedValue([section901]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rechaza si una sección destino no pertenece al grado', async () => {
    const otroGradoSection = new Section('section-otro', 'grade-decimo', '1001');
    sections.findAll.mockResolvedValue([section901, otroGradoSection]);

    await expect(
      useCase.execute({ ...input, sectionIds: ['section-901', 'section-otro'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si no hay matrículas activas para ese grado y año', async () => {
    enrollments.findAll.mockResolvedValue([]);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('reparte por promedio, usa la mediana para los sin historial, y solo reasigna a quien cambia de sección', async () => {
    const e1 = new Enrollment('enr-1', 'student-1', 'section-901', 'year-2026', 'active'); // antiguo, alto
    const e2 = new Enrollment('enr-2', 'student-2', 'section-901', 'year-2026', 'active'); // antiguo, bajo
    const e3 = new Enrollment('enr-3', 'student-3', 'section-901', 'year-2026', 'active'); // nuevo
    const e4 = new Enrollment('enr-4', 'student-4', 'section-902', 'year-2026', 'active'); // nuevo

    enrollments.findAll.mockImplementation(async (filter) => {
      if (filter?.academicYearId === 'year-2026') return [e1, e2, e3, e4];
      if (filter?.studentId === 'student-1') {
        return [new Enrollment('prev-1', 'student-1', 'section-901', 'year-2025', 'completed')];
      }
      if (filter?.studentId === 'student-2') {
        return [new Enrollment('prev-2', 'student-2', 'section-901', 'year-2025', 'completed')];
      }
      return []; // student-3 y student-4 no tienen matrícula previa -> nuevos
    });

    studentYearAverage.compute.mockImplementation(async (enrollmentId: string) => {
      if (enrollmentId === 'prev-1') return 4.8;
      if (enrollmentId === 'prev-2') return 3.0;
      return null;
    });

    const result = await useCase.execute(input);

    // Mediana de los promedios reales [4.8, 3.0] = 3.9 -> student-3 y student-4 usan 3.9.
    // Orden descendente (empate 3.9 se resuelve por orden de llegada, e3 antes que e4):
    // student-1(4.8), student-3(3.9), student-4(3.9), student-2(3.0).
    // Zigzag 2 grupos: ronda 0 (par) -> pos0=grupo0, pos1=grupo1; ronda 1 (impar) -> se invierte.
    // grupo0 = [student-1, student-2], grupo1 = [student-3, student-4].
    expect(result).toHaveLength(4);

    const byStudent = new Map(result.map((r) => [r.studentId, r]));
    expect(byStudent.get('student-1')).toMatchObject({
      newSectionId: 'section-901', previousSectionId: 'section-901', average: 4.8, isReturning: true,
    });
    expect(byStudent.get('student-2')).toMatchObject({
      newSectionId: 'section-901', previousSectionId: 'section-901', average: 3.0, isReturning: true,
    });
    expect(byStudent.get('student-3')).toMatchObject({
      newSectionId: 'section-902', previousSectionId: 'section-901', average: 3.9, isReturning: false,
    });
    expect(byStudent.get('student-4')).toMatchObject({
      newSectionId: 'section-902', previousSectionId: 'section-902', average: 3.9, isReturning: false,
    });

    // Solo student-3 cambia de sección (901 -> 902); el resto ya estaba en la sección que le tocó.
    expect(enrollments.save).toHaveBeenCalledTimes(1);
    expect(e3.sectionId).toBe('section-902');
    expect(e1.sectionId).toBe('section-901');
    expect(e2.sectionId).toBe('section-901');
    expect(e4.sectionId).toBe('section-902');
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd apps/api && npx jest distribute-grade-into-sections.use-case -v`
Expected: FAIL — `Cannot find module './distribute-grade-into-sections.use-case'`

- [ ] **Step 3: Implementar**

```typescript
// apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { StudentYearAverageService } from '../services/student-year-average.service';
import { SectionDistributionService, DistributableStudent } from '../../domain/services/section-distribution.service';

export interface DistributeGradeIntoSectionsInput {
  gradeId: string;
  academicYearId: string;
  sectionIds: string[];
}

export interface DistributeGradeIntoSectionsResultRow {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  previousSectionId: string;
  previousSectionName: string;
  newSectionId: string;
  newSectionName: string;
  average: number | null;
  isReturning: boolean;
}

@Injectable()
export class DistributeGradeIntoSectionsUseCase {
  constructor(
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly studentYearAverage: StudentYearAverageService,
  ) {}

  async execute(input: DistributeGradeIntoSectionsInput): Promise<DistributeGradeIntoSectionsResultRow[]> {
    if (input.sectionIds.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 cursos destino para repartir');
    }

    const grade = await this.grades.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${input.gradeId}"`);
    }

    const targetYear = await this.academicYears.findById(input.academicYearId);
    if (!targetYear) {
      throw new NotFoundException(`No existe el año lectivo "${input.academicYearId}"`);
    }

    const allSections = await this.sections.findAll();
    const targetSections = input.sectionIds.map((id) => {
      const section = allSections.find((s) => s.id === id);
      if (!section) throw new NotFoundException(`No existe la sección "${id}"`);
      if (section.gradeId !== input.gradeId) {
        throw new BadRequestException(`La sección "${section.name}" no pertenece a este grado`);
      }
      return section;
    });

    const gradeSectionIds = new Set(allSections.filter((s) => s.gradeId === input.gradeId).map((s) => s.id));
    const currentEnrollments = (await this.enrollments.findAll({ academicYearId: input.academicYearId })).filter(
      (e) => e.status === 'active' && gradeSectionIds.has(e.sectionId),
    );

    if (currentEnrollments.length === 0) {
      throw new NotFoundException('No hay matrículas activas para ese grado en ese año lectivo');
    }

    const allYears = await this.academicYears.findAll();
    const yearStartDateById = new Map(allYears.map((y) => [y.id, y.startDate]));
    const targetStartDate = targetYear.startDate;

    const candidates: { enrollment: Enrollment; average: number | null; isReturning: boolean }[] = [];
    for (const enrollment of currentEnrollments) {
      const priorEnrollments = (await this.enrollments.findAll({ studentId: enrollment.studentId }))
        .filter((e) => e.status !== 'withdrawn' && e.academicYearId !== input.academicYearId)
        .filter((e) => (yearStartDateById.get(e.academicYearId) ?? '') < targetStartDate)
        .sort((a, b) =>
          (yearStartDateById.get(b.academicYearId) ?? '').localeCompare(yearStartDateById.get(a.academicYearId) ?? ''),
        );

      const mostRecentPrior = priorEnrollments[0] ?? null;
      const isReturning = mostRecentPrior !== null;
      const average = mostRecentPrior ? await this.studentYearAverage.compute(mostRecentPrior.id) : null;

      candidates.push({ enrollment, average, isReturning });
    }

    const realAverages = candidates.map((c) => c.average).filter((a): a is number => a !== null);
    const median = SectionDistributionService.median(realAverages);

    const distributable: DistributableStudent[] = candidates.map((c) => ({
      enrollmentId: c.enrollment.id,
      average: c.average ?? median,
    }));

    const groups = SectionDistributionService.zigzagDistribute(distributable, targetSections.length);

    const result: DistributeGradeIntoSectionsResultRow[] = [];
    for (let i = 0; i < groups.length; i++) {
      const newSection = targetSections[i];
      for (const enrollmentId of groups[i]) {
        const candidate = candidates.find((c) => c.enrollment.id === enrollmentId)!;
        const enrollment = candidate.enrollment;
        const previousSection = allSections.find((s) => s.id === enrollment.sectionId)!;

        if (enrollment.sectionId !== newSection.id) {
          enrollment.reassignSection(newSection.id);
          await this.enrollments.save(enrollment);
        }

        const student = await this.users.findById(enrollment.studentId);

        result.push({
          studentId: enrollment.studentId,
          studentName: student?.fullName ?? enrollment.studentId,
          enrollmentId: enrollment.id,
          previousSectionId: previousSection.id,
          previousSectionName: previousSection.name,
          newSectionId: newSection.id,
          newSectionName: newSection.name,
          average: candidate.average,
          isReturning: candidate.isReturning,
        });
      }
    }

    return result;
  }
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd apps/api && npx jest distribute-grade-into-sections.use-case -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.ts apps/api/src/modules/grading/application/use-cases/distribute-grade-into-sections.use-case.spec.ts
git commit -m "feat(grading): agregar DistributeGradeIntoSectionsUseCase"
```

---

### Task 4: DTO, controller y wiring del módulo

**Files:**
- Create: `apps/api/src/modules/grading/interface/dtos/distribute-sections.dto.ts`
- Create: `apps/api/src/modules/grading/interface/controllers/section-distribution.controller.ts`
- Modify: `apps/api/src/modules/grading/grading.module.ts`

**Interfaces:**
- Consumes: `DistributeGradeIntoSectionsUseCase` (Tarea 3), `StudentYearAverageService` (Tarea 2).
- Produces: `POST /enrollment/grades/:gradeId/distribute-sections` — body `{ academicYearId: string; sectionIds: string[] }`, devuelve `DistributeGradeIntoSectionsResultRow[]`. La Tarea 5 (frontend) consume esta ruta exacta.

No hay test nuevo en esta tarea: el codebase no tiene tests de controllers (`find src -iname "*.controller.spec.ts"` → 0 resultados en todo `apps/api`), y la lógica ya está cubierta por la Tarea 3. Se verifica con `curl` manual al final.

- [ ] **Step 1: DTO**

```typescript
// apps/api/src/modules/grading/interface/dtos/distribute-sections.dto.ts
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DistributeSectionsDto {
  @IsUUID()
  academicYearId: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsUUID(undefined, { each: true })
  sectionIds: string[];
}
```

- [ ] **Step 2: Controller**

```typescript
// apps/api/src/modules/grading/interface/controllers/section-distribution.controller.ts
import { Body, Controller, Param, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { DistributeGradeIntoSectionsUseCase } from '../../application/use-cases/distribute-grade-into-sections.use-case';
import { DistributeSectionsDto } from '../dtos/distribute-sections.dto';

@Controller('enrollment/grades')
export class SectionDistributionController {
  constructor(private readonly distribute: DistributeGradeIntoSectionsUseCase) {}

  @Post(':gradeId/distribute-sections')
  @CheckPolicies((ability) => ability.can('update', 'Enrollment'))
  async distributeSections(@Param('gradeId') gradeId: string, @Body() dto: DistributeSectionsDto) {
    return this.distribute.execute({
      gradeId,
      academicYearId: dto.academicYearId,
      sectionIds: dto.sectionIds,
    });
  }
}
```

- [ ] **Step 3: Wiring en `grading.module.ts`**

Modificar `apps/api/src/modules/grading/grading.module.ts`: agregar los 2 imports de clases nuevas, agregar `SectionDistributionController` a `controllers`, y agregar `DistributeGradeIntoSectionsUseCase` + `StudentYearAverageService` a `providers`. No hace falta agregar ningún import de módulo nuevo — `EnrollmentModule` y `AcademicModule` ya están importados, y ambos exportan todos los puertos que las Tareas 2 y 3 necesitan.

```typescript
// agregar estos imports junto a los demás use-cases/services del archivo:
import { SectionDistributionController } from './interface/controllers/section-distribution.controller';
import { StudentYearAverageService } from './application/services/student-year-average.service';
import { DistributeGradeIntoSectionsUseCase } from './application/use-cases/distribute-grade-into-sections.use-case';
```

```typescript
// controllers: agregar SectionDistributionController a la lista existente:
controllers: [EvaluationsController, ScoresController, GradeWeightConfigController, GradebookController, SectionDistributionController],
```

```typescript
// providers: agregar estas dos líneas a la lista existente (junto a GradeWeightConfigService):
StudentYearAverageService,
DistributeGradeIntoSectionsUseCase,
```

- [ ] **Step 4: Correr toda la suite de API para verificar que no se rompió nada**

Run: `cd apps/api && npx jest`
Expected: PASS — todas las suites, incluidas las 2 nuevas de las Tareas 1-3.

- [ ] **Step 5: Verificar manualmente el endpoint**

Con el servidor corriendo (`npm run start:dev` en `apps/api`) y un token válido de `admin_institucion` o `directivo`, correr:

```bash
curl -X POST http://localhost:3001/enrollment/grades/<gradeId>/distribute-sections \
  -H "content-type: application/json" \
  -H "authorization: Bearer <token>" \
  -H "x-tenant-subdomain: colegio-demo" \
  -d '{"academicYearId": "<academicYearId>", "sectionIds": ["<sectionId1>", "<sectionId2>"]}'
```

Expected: `200 OK` con un array de filas (o el error correspondiente si los ids no existen).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/grading/interface/dtos/distribute-sections.dto.ts apps/api/src/modules/grading/interface/controllers/section-distribution.controller.ts apps/api/src/modules/grading/grading.module.ts
git commit -m "feat(grading): exponer POST /enrollment/grades/:gradeId/distribute-sections"
```

---

### Task 5: Tipos compartidos, hook y ruta proxy (capa de datos del frontend)

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `apps/web/src/features/enrollment/use-enrollments.ts`
- Create: `apps/web/src/app/api/enrollments/grades/[gradeId]/distribute-sections/route.ts`

**Interfaces:**
- Consumes: la ruta `POST /enrollment/grades/:gradeId/distribute-sections` (Tarea 4).
- Produces: `useDistributeGradeIntoSections()` (hook de TanStack Query) y el tipo `DistributeSectionsResultRow` — la Tarea 6 (UI) los consume.

No hay test automatizado en esta tarea — sigue el mismo patrón sin tests que el resto de hooks/rutas proxy de `apps/web` (`use-admissions.ts`, `use-academic-years.ts`, ninguno tiene `.spec.ts`). Se verifica con `tsc --noEmit` y en el navegador en la Tarea 6.

- [ ] **Step 1: Agregar el tipo a `packages/shared-types/src/index.ts`**

Agregar, cerca de `GradeAdmissionAvailability`:

```typescript
export interface DistributeSectionsResultRow {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  previousSectionId: string;
  previousSectionName: string;
  newSectionId: string;
  newSectionName: string;
  average: number | null;
  isReturning: boolean;
}
```

- [ ] **Step 2: Agregar el hook a `apps/web/src/features/enrollment/use-enrollments.ts`**

Al final del archivo (mismo patrón que las demás mutations del mismo archivo — `useReassignEnrollmentSection`, etc.):

```typescript
export interface DistributeGradeIntoSectionsInput {
  gradeId: string;
  academicYearId: string;
  sectionIds: string[];
}

async function distributeGradeIntoSections(
  input: DistributeGradeIntoSectionsInput,
): Promise<DistributeSectionsResultRow[]> {
  const { gradeId, ...body } = input;
  const res = await fetch(`/api/enrollments/grades/${gradeId}/distribute-sections`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.message ?? 'No se pudo repartir el grado');
  }
  return res.json();
}

export function useDistributeGradeIntoSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributeGradeIntoSections,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
  });
}
```

Agregar `DistributeSectionsResultRow` al import de `@eduapp/shared-types` que ya existe al principio del archivo.

- [ ] **Step 3: Ruta proxy**

```typescript
// apps/web/src/app/api/enrollments/grades/[gradeId]/distribute-sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverApiFetch } from '@/lib/server-api';
import type { DistributeSectionsResultRow } from '@eduapp/shared-types';

export async function POST(req: NextRequest, { params }: { params: { gradeId: string } }) {
  const body = await req.json();
  const result = await serverApiFetch<DistributeSectionsResultRow[]>(
    `/enrollment/grades/${params.gradeId}/distribute-sections`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (result === null) {
    const message = 'No se pudo repartir el grado';
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p .`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts apps/web/src/features/enrollment/use-enrollments.ts "apps/web/src/app/api/enrollments/grades/[gradeId]/distribute-sections/route.ts"
git commit -m "feat(enrollment): agregar tipos, hook y ruta proxy para repartir secciones"
```

---

### Task 6: UI — botón "Repartir automáticamente" y tabla de resultado

**Files:**
- Create: `apps/web/src/features/enrollment/components/distribute-sections-modal.tsx`
- Modify: `apps/web/src/app/(dashboard)/enrollment/page.tsx`

**Interfaces:**
- Consumes: `useDistributeGradeIntoSections()` (Tarea 5), `useGrades()` (`apps/web/src/features/academic/use-grades.ts`, ya existente), `useSections()` (`apps/web/src/features/academic/use-sections.ts`, ya existente — `Section { id, gradeId, name }`), `useAcademicYears()` (`apps/web/src/features/academic/use-academic-years.ts`, ya existente).
- Produces: componente `DistributeSectionsButton` montado en la página de Matrículas — no lo consume nada más.

No hay test automatizado (el resto de componentes de `apps/web` tampoco los tiene — se verifica en el navegador).

- [ ] **Step 1: Componente**

```tsx
// apps/web/src/features/enrollment/components/distribute-sections-modal.tsx
'use client';

import { useMemo, useState } from 'react';
import { useGrades } from '@/features/academic/use-grades';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useDistributeGradeIntoSections } from '../use-enrollments';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { DistributeSectionsResultRow } from '@eduapp/shared-types';

export function DistributeSectionsButton() {
  const [open, setOpen] = useState(false);
  const [gradeId, setGradeId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [result, setResult] = useState<DistributeSectionsResultRow[] | null>(null);

  const { data: grades } = useGrades();
  const { data: allSections } = useSections();
  const { data: years } = useAcademicYears();
  const distribute = useDistributeGradeIntoSections();

  const gradeSections = useMemo(
    () => (allSections ?? []).filter((s) => s.gradeId === gradeId),
    [allSections, gradeId],
  );

  function toggleSection(sectionId: string) {
    setSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  }

  function handleSubmit() {
    if (!gradeId || !academicYearId || sectionIds.length < 2) return;
    distribute.mutate(
      { gradeId, academicYearId, sectionIds },
      { onSuccess: (rows) => setResult(rows) },
    );
  }

  function reset() {
    setOpen(false);
    setGradeId('');
    setAcademicYearId('');
    setSectionIds([]);
    setResult(null);
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Repartir automáticamente
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded border border-border p-4">
      <p className="font-medium">Repartir estudiantes entre cursos</p>

      {!result && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="distribute-grade">Grado</Label>
            <select
              id="distribute-grade"
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionIds([]);
              }}
              className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un grado</option>
              {(grades ?? []).map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="distribute-year">Año lectivo</Label>
            <select
              id="distribute-year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un año</option>
              {(years ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          {gradeId && (
            <div className="space-y-1.5">
              <Label>Cursos destino (mínimo 2)</Label>
              <div className="flex flex-wrap gap-2">
                {gradeSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`rounded border px-3 py-1 text-sm ${
                      sectionIds.includes(section.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {section.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {distribute.isError && <p className="text-sm text-destructive">{distribute.error.message}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!gradeId || !academicYearId || sectionIds.length < 2 || distribute.isPending}
              onClick={handleSubmit}
            >
              {distribute.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Repartir
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.length} estudiantes repartidos.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1 pr-2">Estudiante</th>
                  <th className="py-1 pr-2">Curso anterior</th>
                  <th className="py-1 pr-2">Curso nuevo</th>
                  <th className="py-1 pr-2">Promedio</th>
                  <th className="py-1">Antiguo</th>
                </tr>
              </thead>
              <tbody>
                {result.map((row) => (
                  <tr key={row.enrollmentId} className="border-b border-border/50">
                    <td className="py-1 pr-2">{row.studentName}</td>
                    <td className="py-1 pr-2">{row.previousSectionName}</td>
                    <td className="py-1 pr-2 font-medium">{row.newSectionName}</td>
                    <td className="py-1 pr-2">{row.average !== null ? row.average.toFixed(2) : '—'}</td>
                    <td className="py-1">{row.isReturning ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" onClick={reset}>
            Cerrar
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Montar el botón en la página de Matrículas**

Modificar `apps/web/src/app/(dashboard)/enrollment/page.tsx`:

```typescript
import { DistributeSectionsButton } from '@/features/enrollment/components/distribute-sections-modal';
```

Y agregar `{canManage && <DistributeSectionsButton />}` justo debajo de `<EnrollStudentForm ... />`, antes de `<EnrollmentsList canManage={canManage} />`.

- [ ] **Step 3: Typecheck y lint**

Run: `cd apps/web && npx tsc --noEmit -p . && npx eslint src/features/enrollment/components/distribute-sections-modal.tsx "src/app/(dashboard)/enrollment/page.tsx"`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Con `apps/web` y `apps/api` corriendo, loguearse como `admin_institucion` o `directivo`, ir a Matrículas, hacer clic en "Repartir automáticamente", elegir un grado con al menos 2 secciones y matrículas activas para el año lectivo elegido, y confirmar que la tabla de resultado se ve bien y que las matrículas quedaron reasignadas (verificable recargando `EnrollmentsList`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/enrollment/components/distribute-sections-modal.tsx "apps/web/src/app/(dashboard)/enrollment/page.tsx"
git commit -m "feat(enrollment): agregar UI para repartir estudiantes entre cursos automáticamente"
```
