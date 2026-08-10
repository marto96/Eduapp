'use client';

import { FormEvent, useState } from 'react';
import { useEnrollStudent } from '../use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function EnrollStudentForm() {
  const { data: students } = useUsers('estudiante');
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const enrollStudent = useEnrollStudent();

  const [studentId, setStudentId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const missingPrereqs = !students?.length || !years?.length || !sections?.length;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!studentId || !academicYearId || !sectionId) return;
    enrollStudent.mutate(
      { studentId, sectionId, academicYearId },
      { onSuccess: () => setStudentId('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="studentId">Estudiante</Label>
        <select
          id="studentId"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná un estudiante
          </option>
          {students?.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Año lectivo</Label>
        <select
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná un año
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
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná una sección
          </option>
          {sections?.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={enrollStudent.isPending || missingPrereqs}>
        {enrollStudent.isPending ? 'Matriculando...' : 'Matricular'}
      </Button>
      {missingPrereqs && (
        <p className="w-full text-sm text-muted-foreground">
          Necesitás al menos un estudiante, un año lectivo y una sección creados.
        </p>
      )}
      {enrollStudent.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo matricular (¿ya tiene una matrícula activa en ese año?).
        </p>
      )}
    </form>
  );
}
