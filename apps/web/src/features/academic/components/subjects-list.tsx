'use client';

import { useSubjects } from '../use-subjects';
import { Card } from '@/components/ui/card';

export function SubjectsList() {
  const { data: subjects, isLoading, error } = useSubjects();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las asignaturas.</p>;
  if (!subjects || subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay asignaturas.</p>;
  }

  return (
    <ul className="space-y-2">
      {subjects.map((subject) => (
        <Card key={subject.id} className="flex items-center justify-between py-3">
          <p className="font-medium">{subject.name}</p>
          <span className="text-xs uppercase text-muted-foreground">{subject.area}</span>
        </Card>
      ))}
    </ul>
  );
}
