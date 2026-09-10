'use client';

import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { useEvaluations } from '@/features/grading/use-evaluations';
import { useCharges } from '@/features/finance/use-charges';
import { useDocuments } from '@/features/documents/use-documents';
import { useLoans } from '@/features/library/use-loans';
import { useBooks } from '@/features/library/use-books';
import { usePortalAttendance, usePortalScores } from '../use-portal-data';
import { ChildSummaryCard } from './child-summary-card';
import { LoadingState } from '@/components/ui/loading-state';

export function PortalView({ isGuardian }: { isGuardian: boolean }) {
  const { data: enrollments, isLoading: loadingEnrollments, error } = useEnrollments();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: sections, isLoading: loadingSections } = useSections();
  const { data: years, isLoading: loadingYears } = useAcademicYears();
  const { data: subjects, isLoading: loadingSubjects } = useSubjects();
  const { data: periods, isLoading: loadingPeriods } = usePeriods();
  const { data: evaluations, isLoading: loadingEvaluations } = useEvaluations();
  const { data: attendance, isLoading: loadingAttendance } = usePortalAttendance();
  const { data: scores, isLoading: loadingScores } = usePortalScores();
  const { data: charges, isLoading: loadingCharges } = useCharges();
  const { data: documents, isLoading: loadingDocuments } = useDocuments();
  const { data: loans, isLoading: loadingLoans } = useLoans();
  const { data: books, isLoading: loadingBooks } = useBooks();

  // Cada hook de arriba es una query independiente — antes solo se esperaba
  // a `enrollments`, así que si `charges`/`attendance`/etc tardaban más,
  // la tarjeta se renderizaba igual con esos datos todavía en `undefined`
  // y mostraba "sin registros" indistinguible de un valor realmente vacío
  // (bug reportado: "no se ve el área de finanzas", que en realidad
  // afectaba a todas las secciones por igual, no solo finanzas).
  const isLoading =
    loadingEnrollments ||
    loadingUsers ||
    loadingSections ||
    loadingYears ||
    loadingSubjects ||
    loadingPeriods ||
    loadingEvaluations ||
    loadingAttendance ||
    loadingScores ||
    loadingCharges ||
    loadingDocuments ||
    loadingLoans ||
    loadingBooks;

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudo cargar la información.</p>;
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
  const periodNameById = new Map(periods?.map((p) => [p.id, p.name]));
  const bookById = new Map(books?.map((b) => [b.id, b]));

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => (
        <ChildSummaryCard
          key={enrollment.id}
          enrollment={enrollment}
          studentName={isGuardian ? userNameById.get(enrollment.studentId) : undefined}
          sectionName={sectionNameById.get(enrollment.sectionId)}
          yearName={yearNameById.get(enrollment.academicYearId)}
          attendance={(attendance ?? []).filter((a) => a.enrollmentId === enrollment.id)}
          scores={(scores ?? []).filter((s) => s.enrollmentId === enrollment.id)}
          evaluations={evaluations ?? []}
          subjectNameById={subjectNameById}
          periodNameById={periodNameById}
          charges={(charges ?? []).filter((c) => c.enrollmentId === enrollment.id)}
          documents={(documents ?? []).filter((d) => d.enrollmentId === enrollment.id)}
          loans={(loans ?? []).filter((l) => l.studentId === enrollment.studentId)}
          bookById={bookById}
        />
      ))}
    </div>
  );
}
