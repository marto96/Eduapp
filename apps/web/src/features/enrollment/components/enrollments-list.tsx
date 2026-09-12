'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, RotateCcw } from 'lucide-react';
import {
  useCompleteEnrollment,
  useEnrollments,
  useReassignEnrollmentSection,
  useWithdrawEnrollment,
} from '../use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useGrades } from '@/features/academic/use-grades';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import type { Enrollment, EnrollmentStatus } from '@eduapp/shared-types';

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Activa',
  withdrawn: 'Retirada',
  completed: 'Completada',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

export function EnrollmentsList({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [committedSearch, pageSize]);

  const { data, isLoading, error } = useEnrollments({ page, pageSize, search: committedSearch || undefined });
  const enrollments = data?.items;
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: grades } = useGrades();
  const withdrawEnrollment = useWithdrawEnrollment();
  const completeEnrollment = useCompleteEnrollment();
  const reassignSection = useReassignEnrollmentSection();
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [newSectionId, setNewSectionId] = useState('');
  const [withdrawingEnrollment, setWithdrawingEnrollment] = useState<Enrollment | null>(null);
  const [completingEnrollment, setCompletingEnrollment] = useState<Enrollment | null>(null);

  const filters = (
    <Input
      placeholder="Buscar por nombre o email del estudiante..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className="w-72"
    />
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-destructive">No se pudieron cargar las matrículas.</p>
      </div>
    );
  }
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay matrículas que coincidan con la búsqueda.' : 'Todavía no hay matrículas.'}
        </p>
      </div>
    );
  }

  const studentNameById = new Map(students?.map((s) => [s.id, s.fullName]));
  const yearNameById = new Map(years?.map((y) => [y.id, y.name]));
  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const sectionById = new Map(sections?.map((s) => [s.id, s]));
  const gradeById = new Map(grades?.map((g) => [g.id, g]));

  /**
   * Repite el mismo grado si reprobó; si aprobó (o es una matrícula vieja
   * sin este dato, `passed === null`) avanza al siguiente grado por orden.
   * Si no hay grado siguiente (es el último) o falta algún dato, se queda
   * en el grado actual — el admin igual puede cambiarlo a mano en el modal.
   */
  function resolveRenewGradeId(enrollment: Enrollment): string | undefined {
    const section = sectionById.get(enrollment.sectionId);
    if (!section) return undefined;
    if (enrollment.passed === false) return section.gradeId;
    const currentGrade = gradeById.get(section.gradeId);
    const nextGrade = currentGrade && grades?.find((g) => g.order === currentGrade.order + 1);
    return nextGrade?.id ?? section.gradeId;
  }

  function confirmComplete(passed: boolean) {
    if (!completingEnrollment) return;
    completeEnrollment.mutate(
      { id: completingEnrollment.id, passed },
      { onSuccess: () => setCompletingEnrollment(null) },
    );
  }

  function startReassign(enrollment: Enrollment) {
    setReassigningId(enrollment.id);
    setNewSectionId('');
  }

  function saveReassign(id: string) {
    if (!newSectionId) return;
    reassignSection.mutate(
      { id, sectionId: newSectionId },
      { onSuccess: () => setReassigningId(null) },
    );
  }

  function confirmWithdraw() {
    if (!withdrawingEnrollment) return;
    withdrawEnrollment.mutate(withdrawingEnrollment.id, {
      onSuccess: () => setWithdrawingEnrollment(null),
    });
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="space-y-2">
        {enrollments.map((enrollment) => {
          const isReassigning = reassigningId === enrollment.id;
          const currentSection = sectionById.get(enrollment.sectionId);
          const candidateSections = sections?.filter(
            (s) => s.gradeId === currentSection?.gradeId && s.id !== enrollment.sectionId,
          );

          return (
            <Card key={enrollment.id} className="py-3">
              <div className="flex items-center justify-between">
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
                  {enrollment.status === 'completed' && enrollment.passed !== null && (
                    <span
                      className={
                        enrollment.passed
                          ? 'rounded bg-success/15 px-1.5 py-0.5 text-xs font-medium text-success'
                          : 'rounded bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning'
                      }
                    >
                      {enrollment.passed ? 'Aprobó' : 'Repite'}
                    </span>
                  )}
                  {canManage && enrollment.status === 'active' && (
                    <>
                      <button
                        type="button"
                        title="Reubicar de sección"
                        aria-label="Reubicar de sección"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => startReassign(enrollment)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                      <Button
                        variant="ghost"
                        disabled={completeEnrollment.isPending}
                        onClick={() => {
                          completeEnrollment.reset();
                          setCompletingEnrollment(enrollment);
                        }}
                      >
                        Completar
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={withdrawEnrollment.isPending}
                        onClick={() => {
                          withdrawEnrollment.reset();
                          setWithdrawingEnrollment(enrollment);
                        }}
                      >
                        Dar de baja
                      </Button>
                    </>
                  )}
                  {canManage && enrollment.status === 'completed' && (
                    <button
                      type="button"
                      title={
                        enrollment.passed === false
                          ? 'Renovar repitiendo el mismo grado'
                          : 'Renovar matrícula para el año lectivo activo'
                      }
                      className="flex items-center gap-1.5 rounded p-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        const params = new URLSearchParams({ renewStudentId: enrollment.studentId });
                        const gradeId = resolveRenewGradeId(enrollment);
                        if (gradeId) params.set('renewGradeId', gradeId);
                        router.push(`/enrollment?${params.toString()}`);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Renovar
                    </button>
                  )}
                </div>
              </div>
              {isReassigning && (
                <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-border pt-2">
                  <select
                    value={newSectionId}
                    onChange={(e) => setNewSectionId(e.target.value)}
                    className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="" disabled>
                      Nueva sección
                    </option>
                    {candidateSections?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={reassignSection.isPending || !newSectionId}
                    onClick={() => saveReassign(enrollment.id)}
                  >
                    {reassignSection.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setReassigningId(null)}>
                    Cancelar
                  </Button>
                  {!candidateSections?.length && (
                    <p className="w-full text-sm text-muted-foreground">
                      No hay otra sección disponible en el mismo grado.
                    </p>
                  )}
                  {reassignSection.isError && (
                    <p className="w-full text-sm text-destructive">{reassignSection.error.message}</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </ul>
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      )}
      <ConfirmDialog
        open={withdrawingEnrollment !== null}
        onClose={() => {
          setWithdrawingEnrollment(null);
          withdrawEnrollment.reset();
        }}
        onConfirm={confirmWithdraw}
        title="Dar de baja matrícula"
        description={`¿Dar de baja a ${
          withdrawingEnrollment ? studentNameById.get(withdrawingEnrollment.studentId) ?? withdrawingEnrollment.studentId : ''
        }? Esta acción no se puede deshacer — hoy no existe una forma de reactivar una matrícula retirada.`}
        confirmLabel="Dar de baja"
        isConfirming={withdrawEnrollment.isPending}
        errorMessage={withdrawEnrollment.isError ? withdrawEnrollment.error.message : undefined}
      />
      <Dialog
        open={completingEnrollment !== null}
        onClose={() => setCompletingEnrollment(null)}
        title="Completar matrícula"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿{completingEnrollment ? studentNameById.get(completingEnrollment.studentId) ?? completingEnrollment.studentId : ''}{' '}
            aprobó el año lectivo? Esto define si "Renovar" sugiere el siguiente grado o repetir el mismo.
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" disabled={completeEnrollment.isPending} onClick={() => confirmComplete(true)}>
              {completeEnrollment.isPending ? 'Guardando...' : 'Sí, aprobó'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={completeEnrollment.isPending}
              onClick={() => confirmComplete(false)}
            >
              No, repite el grado
            </Button>
            <Button variant="ghost" type="button" onClick={() => setCompletingEnrollment(null)}>
              Cancelar
            </Button>
          </div>
          {completeEnrollment.isError && (
            <p className="text-sm text-destructive">{completeEnrollment.error.message}</p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
