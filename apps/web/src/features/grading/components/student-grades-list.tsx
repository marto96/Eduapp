import type { Evaluation, GradeCategory, GradeScore } from '@eduapp/shared-types';

const CATEGORY_LABELS: Record<GradeCategory, string> = {
  actividad: 'Actividad',
  evaluacion_bimestral: 'Evaluación bimestral',
  disciplina: 'Disciplina',
};

/**
 * Lista de notas de una matrícula — misma presentación en el portal
 * familiar ("Mi familia") y en la vista dedicada de Calificaciones.
 */
export function StudentGradesList({
  scores,
  evaluations,
  subjectNameById,
  periodNameById,
}: {
  scores: GradeScore[];
  evaluations: Evaluation[];
  subjectNameById: Map<string, string>;
  periodNameById: Map<string, string>;
}) {
  const evaluationById = new Map(evaluations.map((e) => [e.id, e]));

  if (scores.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin notas todavía.</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      {scores.map((score) => {
        const evaluation = evaluationById.get(score.evaluationId);
        return (
          <li key={score.id}>
            {evaluation
              ? `${subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId} — ${periodNameById.get(evaluation.periodId) ?? evaluation.periodId} (${CATEGORY_LABELS[evaluation.category]})`
              : score.evaluationId}
            : {score.score}
            {evaluation ? `/${evaluation.maxScore}` : ''}
          </li>
        );
      })}
    </ul>
  );
}
