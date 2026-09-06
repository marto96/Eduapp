'use client';

import { useMemo, useState } from 'react';
import { useGrades } from '@/features/academic/use-grades';
import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useDistributeGradeIntoSections } from '../use-enrollments';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { DistributeSectionsResultRow } from '@eduapp/shared-types';

export function DistributeSectionsButton() {
  const [open, setOpen] = useState(false);
  const [gradeId, setGradeId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [result, setResult] = useState<DistributeSectionsResultRow[] | null>(null);

  const { data: grades } = useGrades();
  const { data: allSections } = useSections();
  const { data: years } = useAcademicYears();
  const distribute = useDistributeGradeIntoSections();

  const gradeSections = useMemo(
    () => (allSections ?? []).filter((s) => s.gradeId === gradeId),
    [allSections, gradeId],
  );

  function toggleSection(sectionId: string) {
    setSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  }

  function handleSubmit() {
    if (!gradeId || !academicYearId || sectionIds.length < 2) return;
    distribute.mutate(
      { gradeId, academicYearId, sectionIds },
      { onSuccess: (rows) => setResult(rows) },
    );
  }

  function reset() {
    setOpen(false);
    setGradeId('');
    setAcademicYearId('');
    setSectionIds([]);
    setResult(null);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Repartir automáticamente
      </Button>
      <Dialog open={open} onClose={reset} title="Repartir estudiantes entre cursos" className="max-w-2xl">
      {!result && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="distribute-grade">Grado</Label>
            <select
              id="distribute-grade"
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionIds([]);
              }}
              className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un grado</option>
              {(grades ?? []).map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="distribute-year">Año lectivo</Label>
            <select
              id="distribute-year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un año</option>
              {(years ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          {gradeId && (
            <div className="space-y-1.5">
              <Label>Cursos destino (mínimo 2)</Label>
              <div className="flex flex-wrap gap-2">
                {gradeSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`rounded border px-3 py-1 text-sm ${
                      sectionIds.includes(section.id)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {section.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {distribute.isError && <p className="text-sm text-destructive">{distribute.error.message}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!gradeId || !academicYearId || sectionIds.length < 2 || distribute.isPending}
              onClick={handleSubmit}
            >
              {distribute.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Repartir
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.length} estudiantes repartidos.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1 pr-2">Estudiante</th>
                  <th className="py-1 pr-2">Curso anterior</th>
                  <th className="py-1 pr-2">Curso nuevo</th>
                  <th className="py-1 pr-2">Promedio</th>
                  <th className="py-1">Antiguo</th>
                </tr>
              </thead>
              <tbody>
                {result.map((row) => (
                  <tr key={row.enrollmentId} className="border-b border-border/50">
                    <td className="py-1 pr-2">{row.studentName}</td>
                    <td className="py-1 pr-2">{row.previousSectionName}</td>
                    <td className="py-1 pr-2 font-medium">{row.newSectionName}</td>
                    <td className="py-1 pr-2">{row.average !== null ? row.average.toFixed(2) : '—'}</td>
                    <td className="py-1">{row.isReturning ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" onClick={reset}>
            Cerrar
          </Button>
        </div>
      )}
      </Dialog>
    </>
  );
}
