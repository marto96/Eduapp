'use client';

import { FormEvent, useState } from 'react';
import { useCreateEvaluation } from '../use-evaluations';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useSections } from '@/features/academic/use-sections';
import { useSubjects } from '@/features/academic/use-subjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EvaluationType } from '@eduapp/shared-types';

const TYPES: { value: EvaluationType; label: string }[] = [
  { value: 'examen', label: 'Examen' },
  { value: 'tarea', label: 'Tarea' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'otro', label: 'Otro' },
];

export function CreateEvaluationForm() {
  const { data: years } = useAcademicYears();
  const { data: sections } = useSections();
  const { data: subjects } = useSubjects();
  const createEvaluation = useCreateEvaluation();

  const [academicYearId, setAcademicYearId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [period, setPeriod] = useState('');
  const [type, setType] = useState<EvaluationType>('examen');
  const [maxScore, setMaxScore] = useState('10');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYearId || !sectionId || !subjectId) return;
    createEvaluation.mutate(
      {
        academicYearId,
        sectionId,
        subjectId,
        period,
        type,
        maxScore: Number(maxScore),
      },
      { onSuccess: () => setPeriod('') },
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
          onChange={(e) => setAcademicYearId(e.target.value)}
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
        <Label htmlFor="period">Período</Label>
        <Input
          id="period"
          placeholder="Trimestre 1"
          required
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as EvaluationType)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
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
