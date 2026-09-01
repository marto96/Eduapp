'use client';

import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSubjects } from '@/features/academic/use-subjects';
import { useEvaluations } from '@/features/grading/use-evaluations';
import { useCharges } from '@/features/finance/use-charges';
import { useDocuments } from '@/features/documents/use-documents';
import { useLoans } from '@/features/library/use-loans';
import { useBooks } from '@/features/library/use-books';
import { usePortalAttendance, usePortalScores } from '../use-portal-data';
import { ChildSummaryCard } from './child-summary-card';
import { LoadingState } from '@/components/ui/loading-state';

export function PortalView({ isGuardian }: { isGuardian: boolean }) {
  const { data: enrollments, isLoading, error } = useEnrollments();
  const { data: users } = useUsers();
  const { data: sections } = useSections();
  const { data: years } = useAcademicYears();
  const { data: subjects } = useSubjects();
  const { data: evaluations } = useEvaluations();
  const { data: attendance } = usePortalAttendance();
  const { data: scores } = usePortalScores();
  const { data: charges } = useCharges();
  const { data: documents } = useDocuments();
  const { data: loans } = useLoans();
  const { data: books } = useBooks();

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
          charges={(charges ?? []).filter((c) => c.enrollmentId === enrollment.id)}
          documents={(documents ?? []).filter((d) => d.enrollmentId === enrollment.id)}
          loans={(loans ?? []).filter((l) => l.studentId === enrollment.studentId)}
          bookById={bookById}
        />
      ))}
    </div>
  );
}
