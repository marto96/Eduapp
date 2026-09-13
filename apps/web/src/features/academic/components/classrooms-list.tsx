'use client';

import { useClassrooms } from '../use-classrooms';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function ClassroomsList() {
  const { data: classrooms, isLoading, error } = useClassrooms();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las aulas.</p>;
  if (!classrooms || classrooms.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay aulas.</p>;
  }

  return (
    <ul className="space-y-2">
      {classrooms.map((classroom) => (
        <Card key={classroom.id} className="flex items-center justify-between py-3">
          <p className="font-medium">{classroom.name}</p>
          <span className="text-xs uppercase text-muted-foreground">Capacidad: {classroom.capacity}</span>
        </Card>
      ))}
    </ul>
  );
}
