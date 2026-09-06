'use client';

import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { GradebookTable } from './gradebook-table';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

/**
 * Vista de solo lectura del boletín del usuario (o de sus hijos, si es
 * acudiente) — reusa `GradebookTable` (la misma tabla materias×periodos
 * que ya usa el docente/admin en Calificaciones → Boletín) en modo
 * `readOnly`, y el endpoint `GET /grading/gradebook/:enrollmentId`, que ya
 * valida por su cuenta que este usuario solo pueda pedir su propia
 * matrícula (o la de sus hijos) — no hace falta ningún cambio de backend.
 */
export function MyGradesView() {
  const { data: enrollments, isLoading, error } = useEnrollments();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las calificaciones.</p>;
  if (!enrollments || enrollments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay matrículas vinculadas a tu cuenta.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <Card key={enrollment.id}>
          <GradebookTable enrollmentId={enrollment.id} readOnly />
        </Card>
      ))}
    </div>
  );
}
