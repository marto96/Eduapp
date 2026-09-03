'use client';

import { useSubjectPeriodDetail } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

          <Button type="button" onClick={onAddGrade} className="w-full">
            Agregar nota
          </Button>
        </div>
      )}
    </Dialog>
  );
}
