'use client';

import { useSchedules } from '@/features/schedule/use-schedules';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { getTodayDayOfWeek } from '../day-of-week';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function TodayScheduleWidget({ teacherId }: { teacherId: string }) {
  const today = getTodayDayOfWeek();
  const { data: schedules, isLoading } = useSchedules(
    today ? { teacherId, dayOfWeek: today } : undefined,
  );
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));
  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));

  const todaysClasses = (schedules ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Card className="lg:col-span-2">
      <p className="text-[10px] uppercase tracking-wide text-primary">Horario de hoy</p>
      {!today && <p className="mt-2 text-sm text-muted-foreground">Sin clases hoy.</p>}
      {today && isLoading && <LoadingState className="mt-2" />}
      {today && !isLoading && todaysClasses.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Sin clases hoy.</p>
      )}
      <ul className="mt-2 space-y-2">
        {todaysClasses.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">
              {subjectNameById.get(entry.subjectId) ?? entry.subjectId} — Sección{' '}
              {sectionNameById.get(entry.sectionId) ?? entry.sectionId}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {entry.startTime}–{entry.endTime}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
