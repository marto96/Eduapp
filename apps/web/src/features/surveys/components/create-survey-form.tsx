'use client';

import { FormEvent, useState } from 'react';
import { useCreateSurvey } from '../use-surveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuestionDraft {
  text: string;
  options: string[];
}

function emptyQuestion(): QuestionDraft {
  return { text: '', options: ['', ''] };
}

export function CreateSurveyForm() {
  const createSurvey = useCreateSurvey();
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [closesAt, setClosesAt] = useState('');

  function updateQuestionText(index: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)));
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q)),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(qIndex: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== qIndex));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanQuestions = questions
      .map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.text && q.options.length >= 2);
    if (cleanQuestions.length < 1) return;

    createSurvey.mutate(
      {
        questions: cleanQuestions,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setQuestions([emptyQuestion()]);
          setClosesAt('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questions.map((question, qIndex) => (
        <div key={qIndex} className="space-y-2 rounded border border-border p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`question-${qIndex}`}>Pregunta {qIndex + 1}</Label>
              <Input
                id={`question-${qIndex}`}
                placeholder="¿Qué horario preferís para la reunión de padres?"
                required
                value={question.text}
                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
              />
            </div>
            {questions.length > 1 && (
              <Button variant="ghost" type="button" onClick={() => removeQuestion(qIndex)}>
                Quitar pregunta
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Opciones</Label>
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <Input
                  placeholder={`Opción ${oIndex + 1}`}
                  value={option}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                />
                {question.options.length > 2 && (
                  <Button variant="ghost" type="button" onClick={() => removeOption(qIndex, oIndex)}>
                    Quitar
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" type="button" onClick={() => addOption(qIndex)}>
              + Agregar opción
            </Button>
          </div>
        </div>
      ))}
      <Button variant="ghost" type="button" onClick={addQuestion}>
        + Agregar pregunta
      </Button>
      <div className="space-y-1.5">
        <Label htmlFor="closesAt">Fecha de cierre (opcional)</Label>
        <Input
          id="closesAt"
          type="datetime-local"
          className="w-56"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createSurvey.isPending}>
        {createSurvey.isPending ? 'Creando...' : 'Crear encuesta'}
      </Button>
      {createSurvey.isError && (
        <p className="text-sm text-destructive">No se pudo crear la encuesta.</p>
      )}
    </form>
  );
}
