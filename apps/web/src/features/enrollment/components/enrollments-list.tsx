'use client';

import {
  useCompleteEnrollment,
  useEnrollments,
  useWithdrawEnrollment,
} from '../use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import type { EnrollmentStatus } from '@eduapp/shared-types';

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Activa',
  withdrawn: 'Retirada',
  completed: 'Completada',
};

export function EnrollmentsList({ canManage }: { canManage: boolean }) {
  const { data: enrollments, isLoading, error } = useEnrollments();
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const withdrawEnrollment = useWithdrawEnrollment();
  const completeEnrollment = useCompleteEnrollment();

  if (isLoading) return <LoadingState />;
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
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase text-muted-foreground">
              {STATUS_LABELS[enrollment.status]}
            </span>
            {canManage && enrollment.status === 'active' && (
              <>
                <Button
                  variant="ghost"
                  disabled={completeEnrollment.isPending}
                  onClick={() => completeEnrollment.mutate(enrollment.id)}
                >
                  Completar
                </Button>
                <Button
                  variant="ghost"
                  disabled={withdrawEnrollment.isPending}
                  onClick={() => withdrawEnrollment.mutate(enrollment.id)}
                >
                  Dar de baja
                </Button>
              </>
            )}
          </div>
        </Card>
      ))}
    </ul>
  );
}
