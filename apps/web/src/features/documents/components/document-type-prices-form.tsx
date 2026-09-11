'use client';

import { useState, useEffect } from 'react';
import type { DocumentType } from '@eduapp/shared-types';
import { useDocumentTypePrices, useSetDocumentTypePrice } from '../use-document-requests';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'certificado_notas', label: 'Certificado de notas' },
  { value: 'constancia_buena_conducta', label: 'Constancia de buena conducta' },
  { value: 'otro', label: 'Otro' },
];

export function DocumentTypePricesForm() {
  const { data: prices, isLoading } = useDocumentTypePrices();
  const setPrice = useSetDocumentTypePrice();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!prices) return;
    setAmounts(Object.fromEntries(prices.map((p) => [p.type, String(p.amount)])));
  }, [prices]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {TYPES.map((t) => (
        <div key={t.value} className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`price-${t.value}`}>{t.label}</Label>
            <input
              id={`price-${t.value}`}
              type="number"
              min={0}
              value={amounts[t.value] ?? '0'}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [t.value]: e.target.value }))}
              className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button
            variant="secondary"
            disabled={setPrice.isPending}
            onClick={() => setPrice.mutate({ type: t.value, amount: Number(amounts[t.value] ?? 0) })}
          >
            Guardar
          </Button>
        </div>
      ))}
    </div>
  );
}
