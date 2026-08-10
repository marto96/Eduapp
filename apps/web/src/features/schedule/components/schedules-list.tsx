'use client';

import { useSchedules } from '../use-schedules';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';

const DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};

export function SchedulesList() {
  const { data: schedules, isLoading, error } = useSchedules();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los horarios.</p>;
  if (!schedules || schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay horarios.</p>;
  }

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));
  const teacherNameById = new Map(teachers?.map((t) => [t.id, t.fullName]));

  return (
    <ul className="space-y-2">
      {schedules.map((schedule) => (
        <Card key={schedule.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">
              {subjectNameById.get(schedule.subjectId) ?? schedule.subjectId} — Sección{' '}
              {sectionNameById.get(schedule.sectionId) ?? schedule.sectionId}
            </p>
            <p className="text-sm text-muted-foreground">
              {teacherNameById.get(schedule.teacherId) ?? schedule.teacherId}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {DAY_LABELS[schedule.dayOfWeek] ?? schedule.dayOfWeek} {schedule.startTime}–
            {schedule.endTime}
          </span>
        </Card>
      ))}
    </ul>
  );
}
