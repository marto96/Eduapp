'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSubjectPeriodDetail, useRecordGradeRecovery } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

export function SubjectPeriodDetailModal({
  enrollmentId,
  subjectId,
  periodId,
  onClose,
  onAddGrade,
}: {
  enrollmentId: string | null;
  subjectId: string | null;
  periodId: string | null;
  onClose: () => void;
  onAddGrade: () => void;
}) {
  const open = enrollmentId !== null && subjectId !== null && periodId !== null;
  const { data: detail, isLoading, error } = useSubjectPeriodDetail(enrollmentId, subjectId, periodId);
  const recordRecovery = useRecordGradeRecovery();
  const [recoveryScore, setRecoveryScore] = useState('');

  useEffect(() => {
    setRecoveryScore('');
  }, [enrollmentId, subjectId, periodId]);

  function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !subjectId || !periodId || recoveryScore.trim() === '') return;
    recordRecovery.mutate(
      { enrollmentId, subjectId, periodId, score: Number(recoveryScore) },
      { onSuccess: () => setRecoveryScore('') },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={detail ? `${detail.subjectName} — ${detail.periodName}` : 'Detalle de la nota'}
    >
      {isLoading && <LoadingState />}
      {error && <p className="text-sm text-destructive">No se pudo cargar el detalle.</p>}
      {detail && (
        <div className="space-y-4">
          <p className="text-sm">
            Nota del periodo:{' '}
            <span className="font-semibold">{detail.grade === null ? '-' : detail.grade.toFixed(2)}</span>
            {detail.isPartial && (
              <span className="ml-2 text-xs text-muted-foreground">
                (parcial — todavía faltan categorías por cargar)
              </span>
            )}
          </p>

          {detail.categories.map((category) => (
            <div key={category.category} className="space-y-1.5 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {CATEGORY_LABELS[category.category]} ({Math.round(category.weight * 100)}%)
                </p>
                <p className="text-sm text-muted-foreground">
                  {category.average === null ? 'Sin notas cargadas' : `Promedio: ${category.average.toFixed(2)}`}
                </p>
              </div>
              {category.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no hay evaluaciones en esta categoría.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {category.items.map((item) => (
                    <li key={item.evaluationId} className="flex items-center justify-between">
                      <span>{item.label ?? 'Sin nombre'}</span>
                      <span className="text-muted-foreground">
                        {item.rawScore === null ? 'Sin calificar' : `${item.rawScore} / ${item.maxScore}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {detail.isRecovered ? (
            <p className="rounded border border-border bg-muted/40 p-3 text-sm">
              <span className="font-medium">Recuperada</span> — nota registrada:{' '}
              {detail.grade === null ? '-' : detail.grade.toFixed(2)}
            </p>
          ) : (
            detail.grade !== null &&
            detail.grade < detail.minPassingGrade && (
              <form onSubmit={handleRecoverySubmit} className="space-y-2 rounded border border-border p-3">
                <Label htmlFor="recovery-score">Registrar recuperación</Label>
                <div className="flex gap-2">
                  <Input
                    id="recovery-score"
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    required
                    value={recoveryScore}
                    onChange={(e) => setRecoveryScore(e.target.value)}
                  />
                  <Button type="submit" disabled={recordRecovery.isPending}>
                    {recordRecovery.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                {recordRecovery.isError && (
                  <p className="text-sm text-destructive">{recordRecovery.error.message}</p>
                )}
              </form>
            )
          )}

          <Button type="button" onClick={onAddGrade} className="w-full">
            Agregar nota
          </Button>
        </div>
      )}
    </Dialog>
  );
}
