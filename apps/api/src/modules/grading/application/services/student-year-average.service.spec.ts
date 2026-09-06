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
