'use client';

import { FormEvent, useState } from 'react';
import { useFinanceReport, FinanceReportParams } from '../use-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FinanceReportView() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [params, setParams] = useState<FinanceReportParams | null>(null);
  const { data: rows, isLoading, error } = useFinanceReport(params);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!from || !to) return;
    setParams({ from, to });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ffrom">Desde</Label>
          <Input id="ffrom" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fto">Hasta</Label>
          <Input id="fto" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit">Ver reporte</Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {error && <p className="text-sm text-destructive">No se pudo cargar el reporte.</p>}
      {rows && rows.length === 0 && params && (
        <p className="text-sm text-muted-foreground">Sin cargos en ese rango.</p>
      )}
      {rows?.map((row) => (
        <Card key={`${row.month}-${row.concept}`} className="flex items-center justify-between py-3">
          <p className="font-medium">
            {row.month} — {row.concept}
          </p>
          <p className="text-sm text-muted-foreground">
            Facturado: ${row.charged} · Cobrado: ${row.collected} · Pendiente: ${row.pending}
          </p>
        </Card>
      ))}
    </div>
  );
}
