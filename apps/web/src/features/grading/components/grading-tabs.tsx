'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CreateEvaluationForm } from './create-evaluation-form';
import { EvaluationsList } from './evaluations-list';
import { RecordScoresForm } from './record-scores-form';
import { GradebookPanel } from './gradebook-panel';

const TABS = {
  boletin: 'Boletín',
  evaluaciones: 'Evaluaciones y notas',
} as const;

type Tab = keyof typeof TABS;

/**
 * Solo quien gestiona calificaciones ve pestañas — para un padre/estudiante
 * de solo lectura, el boletín es lo único relevante, así que se muestra
 * directo sin agregar navegación de más (mismo criterio que FinanceTabs).
 */
export function GradingTabs({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<Tab>('boletin');

  if (!canManage) {
    return <GradebookPanel />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-sm transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {TABS[t]}
          </button>
        ))}
      </div>
      {tab === 'boletin' && <GradebookPanel />}
      {tab === 'evaluaciones' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Evaluaciones</h2>
            <CreateEvaluationForm />
            <EvaluationsList />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Cargar notas</h2>
            <RecordScoresForm readOnly={false} />
          </section>
        </div>
      )}
    </div>
  );
}
