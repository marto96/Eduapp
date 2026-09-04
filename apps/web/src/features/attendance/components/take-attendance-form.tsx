'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAttendance, useRecordAttendance } from '../use-attendance';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSubjects } from '@/features/academic/use-subjects';
import { useSections } from '@/features/academic/use-sections';
import { useSchedules } from '@/features/schedule/use-schedules';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { todayLocalDate } from '@/lib/date';
import type { AttendanceStatus } from '@eduapp/shared-types';

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'justificado', label: 'Justificado' },
];

export function TakeAttendanceForm({
  readOnly = false,
  currentUserId,
  isDocente,
}: {
  readOnly?: boolean;
  currentUserId: string;
  isDocente: boolean;
}) {
  const { data: years } = useAcademicYears();
  const { data: students } = useUsers('estudiante');
  const { data: subjects } = useSubjects();
  const { data: sections } = useSections();

  const [academicYearId, setAcademicYearId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [date, setDate] = useState(todayLocalDate());
  const [statusByEnrollment, setStatusByEnrollment] = useState<Record<string, AttendanceStatus>>(
    {},
  );

  const { data: schedules } = useSchedules(
    academicYearId
      ? { academicYearId, ...(isDocente ? { teacherId: currentUserId } : {}) }
      : undefined,
  );

  const selectedSchedule = schedules?.find((s) => s.id === scheduleId);
  const ready = Boolean(academicYearId && scheduleId && date && selectedSchedule);

  const { data: enrollments } = useEnrollments(
    ready ? { sectionId: selectedSchedule!.sectionId, academicYearId } : undefined,
  );
  const { data: existingRecords } = useAttendance({ scheduleId, date }, ready);
  const recordAttendance = useRecordAttendance();

  const studentNameById = useMemo(
    () => new Map(students?.map((s) => [s.id, s.fullName])),
    [students],
  );

  const subjectNameById = useMemo(() => new Map(subjects?.map((s) => [s.id, s.name])), [subjects]);
  const sectionNameById = useMemo(() => new Map(sections?.map((s) => [s.id, s.name])), [sections]);

  const activeEnrollments = useMemo(
    () => (enrollments ?? []).filter((e) => e.status === 'active'),
    [enrollments],
  );

  // Precarga los estados: el existente si ya se tomó asistencia ese día, si no 'presente'.
  useEffect(() => {
    if (!ready || !enrollments) return;
    const existingByEnrollment = new Map(existingRecords?.map((r) => [r.enrollmentId, r.status]));
    const next: Record<string, AttendanceStatus> = {};
    for (const enrollment of activeEnrollments) {
      next[enrollment.id] = existingByEnrollment.get(enrollment.id) ?? 'presente';
    }
    setStatusByEnrollment(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enrollments, existingRecords]);

  function handleSubmit() {
    recordAttendance.mutate({
      scheduleId,
      date,
      records: activeEnrollments.map((e) => ({
        enrollmentId: e.id,
        status: statusByEnrollment[e.id] ?? 'presente',
      })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="academicYearId">Año lectivo</Label>
          <select
            id="academicYearId"
            value={academicYearId}
            onChange={(e) => {
              setAcademicYearId(e.target.value);
              setScheduleId('');
            }}
            className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Selecciona un año
            </option>
            {years?.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduleId">Horario</Label>
          <select
            id="scheduleId"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            disabled={!academicYearId}
            className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          >
            <option value="" disabled>
              Selecciona una clase
            </option>
            {schedules?.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {`${subjectNameById.get(schedule.subjectId) ?? schedule.subjectId} — ${
                  sectionNameById.get(schedule.sectionId) ?? schedule.sectionId
                } · ${schedule.dayOfWeek} ${schedule.startTime}–${schedule.endTime}`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {ready && activeEnrollments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay estudiantes matriculados en esa sección para ese año lectivo.
        </p>
      )}

      {ready && activeEnrollments.length > 0 && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {activeEnrollments.map((enrollment) => (
              <Card key={enrollment.id} className="flex items-center justify-between py-3">
                <p className="font-medium">
                  {studentNameById.get(enrollment.studentId) ?? enrollment.studentId}
                </p>
                <select
                  value={statusByEnrollment[enrollment.id] ?? 'presente'}
                  disabled={readOnly}
                  onChange={(e) =>
                    setStatusByEnrollment((prev) => ({
                      ...prev,
                      [enrollment.id]: e.target.value as AttendanceStatus,
                    }))
                  }
                  className="flex h-9 w-36 rounded border border-border bg-background px-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Card>
            ))}
          </ul>

          {!readOnly && (
            <>
              <Button onClick={handleSubmit} disabled={recordAttendance.isPending}>
                {recordAttendance.isPending ? 'Guardando...' : 'Guardar asistencia'}
              </Button>
              {recordAttendance.isSuccess && (
                <p className="text-sm text-muted-foreground">Asistencia guardada.</p>
              )}
              {recordAttendance.isError && (
                <p className="text-sm text-destructive">No se pudo guardar la asistencia.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
