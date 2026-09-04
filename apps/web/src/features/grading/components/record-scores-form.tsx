'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEvaluations } from '../use-evaluations';
import { useScores, useRecordScores } from '../use-scores';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

export function RecordScoresForm({ readOnly = false }: { readOnly?: boolean }) {
  const { data: evaluations } = useEvaluations();
  const { data: subjects } = useSubjects();
  const { data: periods } = usePeriods();
  const { data: students } = useUsers('estudiante');
  const [evaluationId, setEvaluationId] = useState('');
  const [scoreByEnrollment, setScoreByEnrollment] = useState<Record<string, string>>({});
  const recordScores = useRecordScores();

  const evaluation = evaluations?.find((e) => e.id === evaluationId);
  const ready = Boolean(evaluation);

  const { data: enrollments } = useEnrollments(
    evaluation ? { sectionId: evaluation.sectionId, academicYearId: evaluation.academicYearId } : undefined,
  );
  const { data: existingScores } = useScores(evaluationId, ready);

  const subjectNameById = useMemo(() => new Map(subjects?.map((s) => [s.id, s.name])), [subjects]);
  const periodNameById = useMemo(() => new Map(periods?.map((p) => [p.id, p.name])), [periods]);
  const studentNameById = useMemo(
    () => new Map(students?.map((s) => [s.id, s.fullName])),
    [students],
  );
  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  useEffect(() => {
    if (!ready || !enrollments) return;
    const existingByEnrollment = new Map(existingScores?.map((s) => [s.enrollmentId, s.score]));
    const next: Record<string, string> = {};
    for (const enrollment of activeEnrollments) {
      const existing = existingByEnrollment.get(enrollment.id);
      next[enrollment.id] = existing !== undefined ? String(existing) : '';
    }
    setScoreByEnrollment(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enrollments, existingScores]);

  function handleSubmit() {
    if (!evaluation) return;
    recordScores.mutate({
      evaluationId: evaluation.id,
      scores: activeEnrollments
        .filter((e) => scoreByEnrollment[e.id] !== '' && scoreByEnrollment[e.id] !== undefined)
        .map((e) => ({ enrollmentId: e.id, score: Number(scoreByEnrollment[e.id]) })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="evaluationId">Evaluación</Label>
        <select
          id="evaluationId"
          value={evaluationId}
          onChange={(e) => setEvaluationId(e.target.value)}
          className="flex h-10 w-72 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Selecciona una evaluación
          </option>
          {evaluations?.map((e) => (
            <option key={e.id} value={e.id}>
              {subjectNameById.get(e.subjectId) ?? e.subjectId} —{' '}
              {periodNameById.get(e.periodId) ?? e.periodId} ({CATEGORY_LABELS[e.category]})
            </option>
          ))}
        </select>
      </div>

      {ready && activeEnrollments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay estudiantes matriculados en la sección de esta evaluación.
        </p>
      )}

      {ready && evaluation && activeEnrollments.length > 0 && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {activeEnrollments.map((enrollment) => (
              <Card key={enrollment.id} className="flex items-center justify-between py-3">
                <p className="font-medium">
                  {studentNameById.get(enrollment.studentId) ?? enrollment.studentId}
                </p>
                <Input
                  type="number"
                  min={0}
                  max={evaluation.maxScore}
                  step="0.1"
                  disabled={readOnly}
                  className="w-24"
                  value={scoreByEnrollment[enrollment.id] ?? ''}
                  onChange={(e) =>
                    setScoreByEnrollment((prev) => ({ ...prev, [enrollment.id]: e.target.value }))
                  }
                />
              </Card>
            ))}
          </ul>

          {!readOnly && (
            <>
              <Button onClick={handleSubmit} disabled={recordScores.isPending}>
                {recordScores.isPending ? 'Guardando...' : 'Guardar notas'}
              </Button>
              {recordScores.isSuccess && (
                <p className="text-sm text-muted-foreground">Notas guardadas.</p>
              )}
              {recordScores.isError && (
                <p className="text-sm text-destructive">No se pudieron guardar las notas.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
