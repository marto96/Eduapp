'use client';

import { useEvaluations } from '../use-evaluations';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { Card } from '@/components/ui/card';

export function EvaluationsList() {
  const { data: evaluations, isLoading, error } = useEvaluations();
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las evaluaciones.</p>;
  if (!evaluations || evaluations.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay evaluaciones.</p>;
  }

  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));

  return (
    <ul className="space-y-2">
      {evaluations.map((evaluation) => (
        <Card key={evaluation.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId} —{' '}
              {evaluation.period}
            </p>
            <p className="text-sm text-muted-foreground">
              {yearNameById.get(evaluation.academicYearId) ?? evaluation.academicYearId} — Sección{' '}
              {sectionNameById.get(evaluation.sectionId) ?? evaluation.sectionId} — máx.{' '}
              {evaluation.maxScore}
            </p>
          </div>
          <span className="text-xs uppercase text-muted-foreground">{evaluation.type}</span>
        </Card>
      ))}
    </ul>
  );
}
