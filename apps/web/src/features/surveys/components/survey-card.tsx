'use client';

import { useState } from 'react';
import { useSurveyResults, useSubmitSurveyResponse } from '../use-surveys';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Survey } from '@eduapp/shared-types';

interface SurveyCardProps {
  survey: Survey;
}

export function SurveyCard({ survey }: SurveyCardProps) {
  const { data: results, isLoading } = useSurveyResults(survey.id);
  const submitResponse = useSubmitSurveyResponse();
  const [selected, setSelected] = useState('');

  function handleVote() {
    if (!selected) return;
    submitResponse.mutate({ surveyId: survey.id, selectedOption: selected });
  }

  return (
    <Card className="space-y-3 py-4">
      <p className="font-medium">{survey.question}</p>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {results && results.respondedOption === null && (
        <div className="space-y-2">
          {survey.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`survey-${survey.id}`}
                value={option}
                checked={selected === option}
                onChange={() => setSelected(option)}
              />
              {option}
            </label>
          ))}
          <Button
            type="button"
            disabled={!selected || submitResponse.isPending}
            onClick={handleVote}
          >
            {submitResponse.isPending ? 'Enviando...' : 'Responder'}
          </Button>
          {submitResponse.isError && (
            <p className="text-sm text-destructive">No se pudo enviar la respuesta.</p>
          )}
        </div>
      )}

      {results && results.respondedOption !== null && (
        <div className="space-y-2">
          {results.options.map((option) => {
            const count = results.counts[option] ?? 0;
            const pct = results.totalResponses > 0 ? Math.round((count / results.totalResponses) * 100) : 0;
            const isMine = option === results.respondedOption;
            return (
              <div key={option} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn(isMine && 'font-medium')}>
                    {option}
                    {isMine && ' (tu respuesta)'}
                  </span>
                  <span className="text-muted-foreground">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div
                    className={cn('h-full rounded', isMine ? 'bg-primary' : 'bg-muted-foreground/40')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">{results.totalResponses} respuesta(s) en total.</p>
        </div>
      )}
    </Card>
  );
}
