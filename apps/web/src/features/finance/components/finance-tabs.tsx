'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CreateChargeForm } from './create-charge-form';
import { ChargesList } from './charges-list';
import { FeeSchedulesPanel } from './fee-schedules-panel';
import { BankReconciliation } from './bank-reconciliation';

const TABS = {
  cargos: 'Cargos',
  precios: 'Lista de precios',
  conciliacion: 'Conciliación bancaria',
} as const;

type Tab = keyof typeof TABS;

/**
 * Solo quien puede gestionar finanzas ve pestañas — para un padre/docente
 * de solo lectura, "Cargos" es lo único relevante, así que se muestra
 * directo sin agregar navegación de más.
 */
export function FinanceTabs({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<Tab>('cargos');

  if (!canManage) {
    return <ChargesList canManage={false} />;
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
      {tab === 'cargos' && (
        <div className="space-y-6">
          <CreateChargeForm />
          <ChargesList canManage={canManage} />
        </div>
      )}
      {tab === 'precios' && <FeeSchedulesPanel />}
      {tab === 'conciliacion' && <BankReconciliation />}
    </div>
  );
}
