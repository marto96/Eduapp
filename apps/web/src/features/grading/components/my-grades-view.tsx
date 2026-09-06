'use client';

import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { useEvaluations } from '@/features/grading/use-evaluations';
import { usePortalAttendance, usePortalScores } from '@/features/portal/use-portal-data';
import { PeriodGradesTable } from './period-grades-table';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

/**
 * Vista de solo lectura de las notas del usuario (o de sus hijos, si es
 * acudiente) — mismos datos que ya se muestran en "Mi familia", pero como
 * su propia pantalla dedicada y descubrible desde el menú. No toca el
 * módulo de gestión de notas del docente (`/grading`), que además tiene
 * permisos de escritura que este rol no debe tener.
 */
export function MyGradesView({ isGuardian }: { isGuardian: boolean }) {
  const { data: enrollments, isLoading, error } = useEnrollments();
  const { data: users } = useUsers();
  const { data: sections } = useSections();
  const { data: years } = useAcademicYears();
  const { data: subjects } = useSubjects();
  const { data: periods } = usePeriods();
  const { data: evaluations } = useEvaluations();
  const { data: scores } = usePortalScores();
  const { data: attendance } = usePortalAttendance();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las calificaciones.</p>;
  if (!enrollments || enrollments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay matrículas vinculadas a tu cuenta.
      </p>
    );
  }

  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <Card key={enrollment.id} className="space-y-3">
          <div>
            <p className="font-medium">
              {isGuardian ? (userNameById.get(enrollment.studentId) ?? 'Estudiante') : 'Mis calificaciones'}
            </p>
            <p className="text-sm text-muted-foreground">
              {yearNameById.get(enrollment.academicYearId) ?? enrollment.academicYearId} — Sección{' '}
              {sectionNameById.get(enrollment.sectionId) ?? enrollment.sectionId}
            </p>
          </div>
          <PeriodGradesTable
            periods={(periods ?? []).filter((p) => p.academicYearId === enrollment.academicYearId)}
            scores={(scores ?? []).filter((s) => s.enrollmentId === enrollment.id)}
            evaluations={evaluations ?? []}
            attendance={(attendance ?? []).filter((a) => a.enrollmentId === enrollment.id)}
            subjectNameById={subjectNameById}
          />
        </Card>
      ))}
    </div>
  );
}
