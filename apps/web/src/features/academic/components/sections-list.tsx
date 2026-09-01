'use client';

import { useSections } from '../use-sections';
import { useGrades } from '../use-grades';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function SectionsList() {
  const { data: sections, isLoading, error } = useSections();
  const { data: grades } = useGrades();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las secciones.</p>;
  if (!sections || sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay secciones.</p>;
  }

  const gradeNameById = new Map(grades?.map((grade) => [grade.id, grade.name]));

  return (
    <ul className="space-y-2">
      {sections.map((section) => (
        <Card key={section.id} className="flex items-center justify-between py-3">
          <p className="font-medium">{section.name}</p>
          <span className="text-xs text-muted-foreground">
            {gradeNameById.get(section.gradeId) ?? section.gradeId}
          </span>
        </Card>
      ))}
    </ul>
  );
}
