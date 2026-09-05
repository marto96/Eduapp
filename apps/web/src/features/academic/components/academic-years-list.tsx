'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAcademicYears, useDeleteAcademicYear, useSetAdmissionsOpen } from '../use-academic-years';
import { usePeriods } from '../use-periods';
import { useGradeWeightConfig } from '@/features/grading/use-grade-weight-config';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { EditAcademicYearModal } from './edit-academic-year-modal';
import { EditGradeWeightConfigButton } from './edit-grade-weight-config-button';
import { EditPeriodModal } from './edit-period-modal';
import { CreatePeriodModal } from './create-period-modal';
import { todayLocalDate } from '@/lib/date';
import type { AcademicYear, Period } from '@eduapp/shared-types';

/** Solo un año lectivo que todavía no arrancó se puede editar o eliminar. */
function isFutureYear(year: AcademicYear): boolean {
  return year.startDate > todayLocalDate();
}

function AcademicYearDetails({
  academicYearId,
  canManage,
}: {
  academicYearId: string;
  canManage: boolean;
}) {
  const { data: periods, isLoading } = usePeriods({ academicYearId });
  const { data: weightConfig } = useGradeWeightConfig();
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  if (isLoading) return <LoadingState />;

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
      <div>
        <div className="flex items-center justify-between">
          <p className="font-medium text-muted-foreground">Períodos</p>
          {canManage && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setCreatingPeriod(true)}
            >
              Agregar período
            </button>
          )}
        </div>
        {!periods || periods.length === 0 ? (
          <p className="text-muted-foreground">Todavía no tiene periodos.</p>
        ) : (
          <ul className="space-y-1">
            {periods.map((period) => (
              <li key={period.id} className="flex items-center justify-between">
                <span>
                  {period.order}. {period.name}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {period.startDate} – {period.endDate} · {Math.round(period.weight * 100)}%
                  {canManage && (
                    <button
                      type="button"
                      className="underline hover:text-foreground"
                      onClick={() => setEditingPeriod(period)}
                    >
                      Editar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {weightConfig && (
        <div>
          <div className="flex items-center justify-between">
            <p className="font-medium text-muted-foreground">Pesos de categoría</p>
            {canManage && <EditGradeWeightConfigButton />}
          </div>
          <ul className="space-y-1">
            <li>Actividad: {Math.round(weightConfig.actividadWeight * 100)}%</li>
            <li>Evaluación bimestral: {Math.round(weightConfig.evaluacionBimestralWeight * 100)}%</li>
            <li>Disciplina: {Math.round(weightConfig.disciplinaWeight * 100)}%</li>
          </ul>
        </div>
      )}
      <EditPeriodModal period={editingPeriod} onClose={() => setEditingPeriod(null)} />
      <CreatePeriodModal
        academicYearId={academicYearId}
        open={creatingPeriod}
        onClose={() => setCreatingPeriod(false)}
      />
    </div>
  );
}

export function AcademicYearsList({ canManage = false }: { canManage?: boolean }) {
  const { data: years, isLoading, error } = useAcademicYears();
  const deleteYear = useDeleteAcademicYear();
  const setAdmissionsOpen = useSetAdmissionsOpen();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los años lectivos.</p>;
  if (!years || years.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay años lectivos.</p>;
  }

  function handleDelete(year: AcademicYear) {
    if (!window.confirm(`¿Eliminar el año lectivo ${year.name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    deleteYear.mutate(year.id);
  }

  return (
    <>
      <ul className="space-y-2">
        {years.map((year) => {
          const expanded = expandedId === year.id;
          const editable = isFutureYear(year);
          return (
            <Card key={year.id} className="py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => setExpandedId(expanded ? null : year.id)}
                >
                  <span className="text-muted-foreground">{expanded ? '▾' : '▸'}</span>
                  <div>
                    <p className="font-medium">{year.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {year.startDate} — {year.endDate}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase text-muted-foreground">{year.status}</span>
                  {canManage && (
                    <button
                      type="button"
                      disabled={setAdmissionsOpen.isPending}
                      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                        year.admissionsOpen
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      onClick={() =>
                        setAdmissionsOpen.mutate({ id: year.id, open: !year.admissionsOpen })
                      }
                    >
                      {year.admissionsOpen ? 'Admisiones abiertas' : 'Admisiones cerradas'}
                    </button>
                  )}
                  {canManage && editable && (
                    <>
                      <button
                        type="button"
                        title="Editar año lectivo"
                        aria-label="Editar año lectivo"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setEditingYear(year)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar año lectivo"
                        aria-label="Eliminar año lectivo"
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        disabled={deleteYear.isPending}
                        onClick={() => handleDelete(year)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {expanded && <AcademicYearDetails academicYearId={year.id} canManage={canManage} />}
            </Card>
          );
        })}
      </ul>
      {deleteYear.isError && <p className="text-sm text-destructive">{deleteYear.error.message}</p>}
      {setAdmissionsOpen.isError && (
        <p className="text-sm text-destructive">{setAdmissionsOpen.error.message}</p>
      )}
      <EditAcademicYearModal year={editingYear} onClose={() => setEditingYear(null)} />
    </>
  );
}
