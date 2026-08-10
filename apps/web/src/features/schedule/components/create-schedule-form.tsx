'use client';

import { FormEvent, useState } from 'react';
import { useCreateSchedule } from '../use-schedules';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { useUsers } from '@/features/users/use-users';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { DayOfWeek } from '@eduapp/shared-types';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
];

export function CreateScheduleForm() {
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const { data: teachers } = useUsers('docente');
  const createSchedule = useCreateSchedule();

  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('lunes');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !subjectId || !teacherId) return;
    createSchedule.mutate({
      academicYearId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Año lectivo</Label>
        <select
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Año
          </option>
          {years?.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sectionId">Sección</Label>
        <select
          id="sectionId"
          required
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="flex h-10 w-28 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Sección
          </option>
          {sections?.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subjectId">Asignatura</Label>
        <select
          id="subjectId"
          required
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Asignatura
          </option>
          {subjects?.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="teacherId">Docente</Label>
        <select
          id="teacherId"
          required
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Docente
          </option>
          {teachers?.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dayOfWeek">Día</Label>
        <select
          id="dayOfWeek"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startTime">Inicio</Label>
        <Input
          id="startTime"
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endTime">Fin</Label>
        <Input
          id="endTime"
          type="time"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createSchedule.isPending}>
        {createSchedule.isPending ? 'Creando...' : 'Crear horario'}
      </Button>
      {createSchedule.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo crear el horario (¿superpone con otro del docente o la sección?).
        </p>
      )}
    </form>
  );
}
