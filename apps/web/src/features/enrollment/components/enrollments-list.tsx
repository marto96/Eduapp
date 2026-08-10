'use client';

import { useEnrollments } from '../use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';

export function EnrollmentsList() {
  const { data: enrollments, isLoading, error } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las matrículas.</p>;
  if (!enrollments || enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay matrículas.</p>;
  }

  const studentNameById = new Map(students?.map((s) => [s.id, s.fullName]));
  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  return (
    <ul className="space-y-2">
      {enrollments.map((enrollment) => (
        <Card key={enrollment.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {studentNameById.get(enrollment.studentId) ?? enrollment.studentId}
            </p>
            <p className="text-sm text-muted-foreground">
              {yearNameById.get(enrollment.academicYearId) ?? enrollment.academicYearId} — Sección{' '}
              {sectionNameById.get(enrollment.sectionId) ?? enrollment.sectionId}
            </p>
          </div>
          <span className="text-xs uppercase text-muted-foreground">{enrollment.status}</span>
        </Card>
      ))}
    </ul>
  );
}
