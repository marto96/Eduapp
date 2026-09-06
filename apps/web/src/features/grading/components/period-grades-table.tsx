import type { AttendanceRecord, Evaluation, GradeCategory, GradeScore, Period } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

/**
 * Notas e inasistencias de una matrícula, organizadas por periodo — cada
 * fila es un periodo lectivo (ordenado por `order`), con sus notas y el
 * conteo de inasistencias cuya fecha cae dentro del rango del periodo.
 */
export function PeriodGradesTable({
  periods,
  scores,
  evaluations,
  attendance,
  subjectNameById,
}: {
  periods: Period[];
  scores: GradeScore[];
  evaluations: Evaluation[];
  attendance: AttendanceRecord[];
  subjectNameById: Map<string, string>;
}) {
  const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);
  const evaluationById = new Map(evaluations.map((e) => [e.id, e]));

  if (sortedPeriods.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay periodos configurados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1 pr-3">Periodo</th>
            <th className="py-1 pr-3">Notas</th>
            <th className="py-1">Inasistencias</th>
          </tr>
        </thead>
        <tbody>
          {sortedPeriods.map((period) => {
            const periodScores = scores.filter((score) => {
              const evaluation = evaluationById.get(score.evaluationId);
              return evaluation?.periodId === period.id;
            });
            const absences = attendance.filter(
              (record) =>
                record.status === 'ausente' && record.date >= period.startDate && record.date <= period.endDate,
            ).length;

            return (
              <tr key={period.id} className="border-b border-border/50 align-top">
                <td className="py-2 pr-3 font-medium">{period.name}</td>
                <td className="py-2 pr-3">
                  {periodScores.length === 0 ? (
                    <span className="text-muted-foreground">Sin notas todavía.</span>
                  ) : (
                    <ul className="space-y-1">
                      {periodScores.map((score) => {
                        const evaluation = evaluationById.get(score.evaluationId)!;
                        return (
                          <li key={score.id}>
                            {subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId} (
                            {CATEGORY_LABELS[evaluation.category]}): {score.score}/{evaluation.maxScore}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className="py-2">{absences}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
