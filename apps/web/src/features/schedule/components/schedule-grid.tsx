'use client';

import { useState } from 'react';
import { useSchedules } from '../use-schedules';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Label } from '@/components/ui/label';

const DAYS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
] as const;

export function ScheduleGrid() {
  const { data: schedules } = useSchedules();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');
  const [sectionId, setSectionId] = useState('');

  const subjectNameById = new Map(subjects?.map((s) => [s.id, s.name]));
  const teacherNameById = new Map(teachers?.map((t) => [t.id, t.fullName]));

  const sectionSchedules = (schedules ?? []).filter((s) => !sectionId || s.sectionId === sectionId);
  const timeSlots = Array.from(
    new Set(sectionSchedules.map((s) => `${s.startTime}-${s.endTime}`)),
  ).sort();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="grid-section">Sección</Label>
        <select
          id="grid-section"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Elegir sección...</option>
          {sections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!sectionId ? (
        <p className="text-sm text-muted-foreground">Elegí una sección para ver su grilla semanal.</p>
      ) : timeSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin horarios cargados para esta sección.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border p-2 text-left text-xs text-muted-foreground">
                  Horario
                </th>
                {DAYS.map((day) => (
                  <th key={day.value} className="border border-border p-2 text-xs text-muted-foreground">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot}>
                  <td className="border border-border p-2 text-xs text-muted-foreground">{slot}</td>
                  {DAYS.map((day) => {
                    const match = sectionSchedules.find(
                      (s) => `${s.startTime}-${s.endTime}` === slot && s.dayOfWeek === day.value,
                    );
                    return (
                      <td key={day.value} className="border border-border p-2 align-top">
                        {match ? (
                          <div>
                            <p className="font-medium">
                              {subjectNameById.get(match.subjectId) ?? match.subjectId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {teacherNameById.get(match.teacherId) ?? match.teacherId}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
