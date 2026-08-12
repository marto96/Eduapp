'use client';

import { useState } from 'react';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function ReportCardView() {
  const { data: sections } = useSections();
  const { data: years } = useAcademicYears();
  const [sectionId, setSectionId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  const ready = !!sectionId && !!academicYearId;
  const { data: enrollments } = useEnrollments(ready ? { sectionId, academicYearId } : undefined);
  const { data: users } = useUsers('estudiante');
  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));

  const baseUrl = ready
    ? `/api/reports/grading/report-card.pdf?sectionId=${sectionId}&academicYearId=${academicYearId}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rc-section">Sección</Label>
          <select
            id="rc-section"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegir...</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-year">Año lectivo</Label>
          <select
            id="rc-year"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegir...</option>
            {years?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        {baseUrl && (
          <a href={baseUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Descargar todos (PDF del curso completo)
          </a>
        )}
      </div>

      {ready && (
        <ul className="space-y-2">
          {(enrollments ?? []).map((enrollment) => (
            <Card key={enrollment.id} className="flex items-center justify-between py-3">
              <p className="text-sm">{userNameById.get(enrollment.studentId) ?? enrollment.studentId}</p>
              <a
                href={`${baseUrl}&studentId=${enrollment.studentId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Descargar
              </a>
            </Card>
          ))}
          {enrollments?.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay estudiantes matriculados.</p>
          )}
        </ul>
      )}
    </div>
  );
}
