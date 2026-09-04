import { GradeCalculationService } from './grade-calculation.service';
import { GradeWeightConfig } from '../entities/grade-weight-config.entity';

describe('GradeCalculationService', () => {
  const weights = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);

  describe('normalize', () => {
    it('escala una nota a 0-5 según su maxScore', () => {
      expect(GradeCalculationService.normalize(8, 10)).toBe(4);
      expect(GradeCalculationService.normalize(5, 5)).toBe(5);
    });
  });

  describe('computeSubjectPeriodGrade', () => {
    it('devuelve grade null si no hay ninguna evaluación', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade([], weights);
      expect(result.grade).toBeNull();
      expect(result.isPartial).toBe(false);
    });

    it('devuelve grade null si hay evaluaciones pero ninguna calificada todavía, y las lista sin calificar', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: null }],
        weights,
      );

      expect(result.grade).toBeNull();
      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeNull();
      expect(actividad.items).toEqual([
        { evaluationId: 'e1', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: null, normalized: null },
      ]);
    });

    it('con las 3 categorías calificadas, combina con los pesos configurados sin redistribuir', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'evaluacion_bimestral', label: null, maxScore: 5, rawScore: 3 },
          { evaluationId: 'e3', category: 'disciplina', label: null, maxScore: 5, rawScore: 5 },
        ],
        weights,
      );

      // 4*0.65 + 3*0.25 + 5*0.10 = 2.6 + 0.75 + 0.5 = 3.85
      expect(result.grade).toBeCloseTo(3.85, 5);
      expect(result.isPartial).toBe(false);
    });

    it('si solo una categoría tiene datos, redistribuye el peso a esa categoría (100%)', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: null, maxScore: 5, rawScore: 4 }],
        weights,
      );

      expect(result.grade).toBeCloseTo(4, 5);
      expect(result.isPartial).toBe(true);
    });

    it('con dos categorías presentes, redistribuye proporcionalmente entre ellas', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: null, maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'evaluacion_bimestral', label: null, maxScore: 5, rawScore: 2 },
        ],
        weights,
      );

      // (4*0.65 + 2*0.25) / (0.65+0.25) = 3.1 / 0.9 = 3.4444...
      expect(result.grade).toBeCloseTo(3.4444, 3);
      expect(result.isPartial).toBe(true);
    });

    it('normaliza notas con escala distinta a 5 antes de promediar', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [{ evaluationId: 'e1', category: 'actividad', label: null, maxScore: 10, rawScore: 8 }],
        weights,
      );

      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeCloseTo(4, 5);
    });

    it('promedia varias evaluaciones dentro de la misma categoría', () => {
      const result = GradeCalculationService.computeSubjectPeriodGrade(
        [
          { evaluationId: 'e1', category: 'actividad', label: 'Taller 1', maxScore: 5, rawScore: 4 },
          { evaluationId: 'e2', category: 'actividad', label: 'Taller 2', maxScore: 5, rawScore: 2 },
        ],
        weights,
      );

      const actividad = result.categories.find((c) => c.category === 'actividad')!;
      expect(actividad.average).toBeCloseTo(3, 5);
    });
  });

  describe('computeAccumulatedGrade', () => {
    it('trata un periodo sin nota como 0, sin redistribuir (reproduce el ejemplo de Física de la imagen)', () => {
      const result = GradeCalculationService.computeAccumulatedGrade([
        { weight: 0.25, grade: 3.48 },
        { weight: 0.25, grade: 3.11 },
        { weight: 0.25, grade: 0.94 },
        { weight: 0.25, grade: null },
      ]);

      expect(result).toBeCloseTo(1.8825, 4);
    });

    it('divide por la suma real de los pesos cuando los periodos no suman 100% (ej. tres periodos al 33% cada uno)', () => {
      const result = GradeCalculationService.computeAccumulatedGrade([
        { weight: 0.33, grade: 4 },
        { weight: 0.33, grade: 3 },
        { weight: 0.33, grade: null },
      ]);

      // Promedio ponderado correcto de los dos periodos calificados según
      // sus propios pesos: (4*0.33 + 3*0.33 + 0*0.33) / (0.33*3) = 2.31 / 0.99 = 2.3333...
      // La fórmula vieja (sin dividir por la suma de pesos) daría 2.31 —
      // ~1% menos, exactamente el bug descripto (los pesos suman 99%, no 100%).
      expect(result).toBeCloseTo(2.3333, 3);
    });

    it('devuelve 0 si la suma de los pesos es 0 (evita dividir por cero)', () => {
      const result = GradeCalculationService.computeAccumulatedGrade([]);
      expect(result).toBe(0);
    });
  });

  describe('computeAccumulatedAbsences', () => {
    it('suma las inasistencias de todos los periodos', () => {
      expect(GradeCalculationService.computeAccumulatedAbsences([0, 1, 0, 0])).toBe(1);
      expect(GradeCalculationService.computeAccumulatedAbsences([])).toBe(0);
    });
  });

  describe('countAbsencesBySubjectAndPeriod', () => {
    const scheduleSubjectMap = new Map([
      ['sched-1', 'subject-A'],
      ['sched-2', 'subject-B'],
    ]);
    const periods = [
      { id: 'p1', startDate: '2026-01-20', endDate: '2026-03-20' },
      { id: 'p2', startDate: '2026-03-21', endDate: '2026-05-20' },
    ];

    it('agrupa por materia y periodo, ignora registros sin horario o fuera de rango', () => {
      const result = GradeCalculationService.countAbsencesBySubjectAndPeriod(
        [
          { scheduleId: 'sched-1', date: '2026-02-10' },
          { scheduleId: 'sched-1', date: '2026-02-11' },
          { scheduleId: 'sched-2', date: '2026-04-05' },
          { scheduleId: null, date: '2026-02-10' },
          { scheduleId: 'sched-1', date: '2026-12-01' },
        ],
        scheduleSubjectMap,
        periods,
      );

      expect(result.get('subject-A')?.get('p1')).toBe(2);
      expect(result.get('subject-B')?.get('p2')).toBe(1);
      expect(result.get('subject-A')?.get('p2')).toBeUndefined();
    });
  });
});
