'use client';

import { FormEvent, useState } from 'react';
import { useCreateEvaluation } from '../use-evaluations';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { usePeriods } from '@/features/academic/use-periods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORIES: { value: GradeCategory; label: string }[] = [
  { value: 'actividad', label: 'Actividad' },
  { value: 'evaluacion_bimestral', label: 'Evaluación bimestral' },
  { value: 'disciplina', label: 'Disciplina' },
];

export function CreateEvaluationForm() {
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const createEvaluation = useCreateEvaluation();

  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [category, setCategory] = useState<GradeCategory>('actividad');
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('10');

  const { data: periods } = usePeriods(academicYearId ? { academicYearId } : undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !subjectId || !periodId) return;
    createEvaluation.mutate(
      {
        academicYearId,
        sectionId,
        subjectId,
        periodId,
        category,
        maxScore: Number(maxScore),
        label: label.trim() || undefined,
      },
      { onSuccess: () => setLabel('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="academicYearId">Año lectivo</Label>
        <select
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => {
            setAcademicYearId(e.target.value);
            setPeriodId('');
          }}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
        <Label htmlFor="periodId">Período</Label>
        <select
          id="periodId"
          required
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          disabled={!academicYearId}
          className="flex h-10 w-36 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        >
          <option value="" disabled>
            Período
          </option>
          {periods?.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Categoría</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GradeCategory)}
          className="flex h-10 w-44 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="label">Etiqueta (opcional)</Label>
        <Input
          id="label"
          placeholder="Taller 1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-32"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxScore">Nota máxima</Label>
        <Input
          id="maxScore"
          type="number"
          min={1}
          className="w-24"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createEvaluation.isPending}>
        {createEvaluation.isPending ? 'Creando...' : 'Crear evaluación'}
      </Button>
      {createEvaluation.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear la evaluación.</p>
      )}
    </form>
  );
}
