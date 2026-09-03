'use client';

import { Fragment } from 'react';
import { useGradebook } from '../use-gradebook';
import { LoadingState } from '@/components/ui/loading-state';

function formatGrade(grade: number | null): string {
  return grade === null ? '-' : grade.toFixed(2);
}

export function GradebookTable({
  enrollmentId,
  onViewDetail,
  onCreateGrade,
}: {
  enrollmentId: string;
  onViewDetail: (subjectId: string, periodId: string) => void;
  onCreateGrade: (subjectId: string, periodId: string) => void;
}) {
  const { data: gradebook, isLoading, error } = useGradebook(enrollmentId);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudo cargar el boletín.</p>;
  if (!gradebook) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-semibold">{gradebook.studentName}</p>
        <p className="text-sm text-muted-foreground">
          {gradebook.academicYearName} — {gradebook.sectionName}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium">Asignatura</th>
              {gradebook.periods.map((period) => (
                <th key={period.id} colSpan={2} className="px-2 py-2 text-center font-medium">
                  {period.name} ({Math.round(period.weight * 100)}%)
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium">Nota Acum.</th>
              <th className="px-2 py-2 text-center font-medium">Inasist. Acum.</th>
            </tr>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th />
              {gradebook.periods.map((period) => (
                <Fragment key={period.id}>
                  <th className="px-2 py-1 text-center font-normal">Nota</th>
                  <th className="px-2 py-1 text-center font-normal">Inasis.</th>
                </Fragment>
              ))}
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {gradebook.subjects.map((subject) => (
              <tr key={subject.subjectId} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium">{subject.subjectName}</td>
                {subject.periods.map((cell) => (
                  <Fragment key={cell.periodId}>
                    <td className="px-2 py-2 text-center">
                      {cell.grade === null ? (
                        <button
                          type="button"
                          className="text-muted-foreground underline hover:text-foreground"
                          onClick={() => onCreateGrade(subject.subjectId, cell.periodId)}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="underline hover:text-primary"
                          onClick={() => onViewDetail(subject.subjectId, cell.periodId)}
                          title={cell.isPartial ? 'Nota parcial: todavía faltan categorías por cargar' : undefined}
                        >
                          {formatGrade(cell.grade)}
                          {cell.isPartial && <span className="text-muted-foreground">·</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-muted-foreground">{cell.absences}</td>
                  </Fragment>
                ))}
                <td className="px-2 py-2 text-center font-medium">{formatGrade(subject.accumulatedGrade)}</td>
                <td className="px-2 py-2 text-center text-muted-foreground">{subject.accumulatedAbsences}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
