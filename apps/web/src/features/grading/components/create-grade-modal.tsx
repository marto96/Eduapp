'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEvaluations } from '../use-evaluations';
import { useCreateGrade } from '../use-gradebook';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GradeCategory } from '@eduapp/shared-types';

const CATEGORIES: { value: GradeCategory; label: string }[] = [
  { value: 'actividad', label: 'Actividad' },
  { value: 'evaluacion_bimestral', label: 'Evaluación bimestral' },
  { value: 'disciplina', label: 'Disciplina' },
];

export function CreateGradeModal({
  enrollmentId,
  subjectId,
  sectionId,
  periodId,
  initialCategory,
  onClose,
}: {
  enrollmentId: string | null;
  subjectId: string | null;
  sectionId: string | null;
  periodId: string | null;
  initialCategory: GradeCategory;
  onClose: () => void;
}) {
  const open = enrollmentId !== null && subjectId !== null && sectionId !== null && periodId !== null;

  const [category, setCategory] = useState<GradeCategory>(initialCategory);
  const [evaluationId, setEvaluationId] = useState('');
  const [label, setLabel] = useState('');
  const [maxScore, setMaxScore] = useState('5');
  const [score, setScore] = useState('');

  useEffect(() => {
    if (open) setCategory(initialCategory);
  }, [open, initialCategory]);

  const { data: candidateEvaluations } = useEvaluations(
    subjectId && periodId && sectionId ? { subjectId, sectionId, periodId, category } : undefined,
  );

  const createGrade = useCreateGrade();

  function handleClose() {
    setEvaluationId('');
    setLabel('');
    setMaxScore('5');
    setScore('');
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enrollmentId || !subjectId || !sectionId || !periodId || score.trim() === '') return;
    createGrade.mutate(
      {
        enrollmentId,
        subjectId,
        sectionId,
        periodId,
        category,
        evaluationId: evaluationId || undefined,
        label: evaluationId ? undefined : label.trim() || undefined,
        maxScore: evaluationId ? undefined : Number(maxScore),
        score: Number(score),
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Agregar nota">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="grade-category">Categoría</Label>
          <select
            id="grade-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as GradeCategory);
              setEvaluationId('');
            }}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="grade-evaluation">Evaluación</Label>
          <select
            id="grade-evaluation"
            value={evaluationId}
            onChange={(e) => setEvaluationId(e.target.value)}
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">+ Crear una nueva</option>
            {candidateEvaluations?.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>
                {evaluation.label ?? 'Sin nombre'} (máx. {evaluation.maxScore})
              </option>
            ))}
          </select>
        </div>

        {!evaluationId && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="grade-label">Nombre (opcional)</Label>
              <Input
                id="grade-label"
                placeholder="Taller 3"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor="grade-max">Nota máxima</Label>
              <Input
                id="grade-max"
                type="number"
                min={1}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="grade-score">Nota del estudiante</Label>
          <Input
            id="grade-score"
            type="number"
            min={0}
            step="0.1"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={createGrade.isPending} className="w-full">
          {createGrade.isPending ? 'Guardando...' : 'Guardar nota'}
        </Button>
        {createGrade.isError && <p className="text-sm text-destructive">{createGrade.error.message}</p>}
      </form>
    </Dialog>
  );
}
