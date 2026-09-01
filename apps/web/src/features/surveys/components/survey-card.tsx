'use client';

import { useState } from 'react';
import {
  useSurveyResults,
  useSubmitSurveyResponse,
  useRescheduleSurvey,
  useVoidSurvey,
} from '../use-surveys';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Survey } from '@eduapp/shared-types';

interface SurveyCardProps {
  survey: Survey;
  canManage?: boolean;
}

export function SurveyCard({ survey, canManage = false }: SurveyCardProps) {
  const { data: results, isLoading } = useSurveyResults(survey.id);
  const submitResponse = useSubmitSurveyResponse();
  const rescheduleSurvey = useRescheduleSurvey();
  const voidSurvey = useVoidSurvey();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [newClosesAt, setNewClosesAt] = useState('');

  const isVoided = !!results?.voidedAt;
  const hasResponded = results ? results.questions.every((q) => q.myAnswer !== null) : false;
  const canVote = results && !hasResponded && !results.isClosed && !isVoided;
  const allAnswered = survey.questions.every((q) => selected[q.id]);

  function handleVote() {
    if (!allAnswered) return;
    submitResponse.mutate({
      surveyId: survey.id,
      answers: Object.entries(selected).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      })),
    });
  }

  function handleReschedule() {
    rescheduleSurvey.mutate(
      { surveyId: survey.id, closesAt: newClosesAt ? new Date(newClosesAt).toISOString() : undefined },
      { onSuccess: () => setNewClosesAt('') },
    );
  }

  return (
    <Card className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        {results?.closesAt && (
          <p className="text-xs text-muted-foreground">
            {results.isClosed ? 'Cerró el' : 'Cierra el'} {new Date(results.closesAt).toLocaleString('es-CO')}
          </p>
        )}
        {isVoided && <span className="text-xs uppercase text-destructive">Anulada</span>}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {results && canVote && (
        <div className="space-y-4">
          {survey.questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <p className="font-medium">{question.text}</p>
              {question.options.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`survey-${survey.id}-${question.id}`}
                    value={option}
                    checked={selected[question.id] === option}
                    onChange={() => setSelected((prev) => ({ ...prev, [question.id]: option }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          <Button type="button" disabled={!allAnswered || submitResponse.isPending} onClick={handleVote}>
            {submitResponse.isPending ? 'Enviando...' : 'Responder'}
          </Button>
          {submitResponse.isError && (
            <p className="text-sm text-destructive">No se pudo enviar la respuesta.</p>
          )}
        </div>
      )}

      {results && isVoided && !hasResponded && (
        <p className="text-sm text-muted-foreground">Esta encuesta fue anulada.</p>
      )}
      {results && !isVoided && results.isClosed && !hasResponded && (
        <p className="text-sm text-muted-foreground">Esta encuesta cerró.</p>
      )}

      {results && (hasResponded || results.isClosed || isVoided) && (
        <div className="space-y-4">
          {results.questions.map((question) => {
            const totalForQuestion = Object.values(question.counts).reduce((a, b) => a + b, 0);
            return (
              <div key={question.questionId} className="space-y-2">
                <p className="font-medium">{question.text}</p>
                {question.options.map((option) => {
                  const count = question.counts[option] ?? 0;
                  const pct = totalForQuestion > 0 ? Math.round((count / totalForQuestion) * 100) : 0;
                  const isMine = option === question.myAnswer;
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
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">{results.totalRespondents} respuesta(s) en total.</p>
        </div>
      )}

      {canManage && !isVoided && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Input
            type="datetime-local"
            className="w-56"
            value={newClosesAt}
            onChange={(e) => setNewClosesAt(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={rescheduleSurvey.isPending}
            onClick={handleReschedule}
          >
            Actualizar cierre
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={voidSurvey.isPending}
            onClick={() => voidSurvey.mutate(survey.id)}
          >
            Anular
          </Button>
        </div>
      )}
    </Card>
  );
}
