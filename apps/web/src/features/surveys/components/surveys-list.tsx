'use client';

import { useSurveys } from '../use-surveys';
import { SurveyCard } from './survey-card';
import { LoadingState } from '@/components/ui/loading-state';

export function SurveysList({ canManage = false }: { canManage?: boolean }) {
  const { data: surveys, isLoading, error } = useSurveys();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las encuestas.</p>;
  if (!surveys || surveys.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay encuestas publicadas.</p>;
  }

  return (
    <div className="space-y-3">
      {surveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} canManage={canManage} />
      ))}
    </div>
  );
}
