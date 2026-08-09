'use client';

import { useGrades } from '../use-grades';
import { Card } from '@/components/ui/card';

export function GradesList() {
  const { data: grades, isLoading, error } = useGrades();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los grados.</p>;
  if (!grades || grades.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay grados.</p>;
  }

  return (
    <ul className="space-y-2">
      {grades.map((grade) => (
        <Card key={grade.id} className="flex items-center justify-between py-3">
          <p className="font-medium">{grade.name}</p>
          <span className="text-xs uppercase text-muted-foreground">{grade.level}</span>
        </Card>
      ))}
    </ul>
  );
}
