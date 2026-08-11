'use client';

import { FormEvent, useState } from 'react';
import { useCreateSurvey } from '../use-surveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateSurveyForm() {
  const createSurvey = useCreateSurvey();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    createSurvey.mutate(
      { question, options: cleanOptions },
      {
        onSuccess: () => {
          setQuestion('');
          setOptions(['', '']);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="question">Pregunta</Label>
        <Input
          id="question"
          placeholder="¿Qué horario preferís para la reunión de padres?"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Opciones</Label>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Opción ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
            />
            {options.length > 2 && (
              <Button variant="ghost" type="button" onClick={() => removeOption(index)}>
                Quitar
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" type="button" onClick={addOption}>
          + Agregar opción
        </Button>
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
