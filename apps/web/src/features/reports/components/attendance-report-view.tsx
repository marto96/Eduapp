'use client';

import { FormEvent, useState } from 'react';
import { useSections } from '@/features/academic/use-sections';
import { useAttendanceReport, AttendanceReportParams } from '../use-reports';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AttendanceReportView() {
  const { data: sections } = useSections();
  const [sectionId, setSectionId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [params, setParams] = useState<AttendanceReportParams | null>(null);
  const { data: rows, isLoading, error } = useAttendanceReport(params);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sectionId || !from || !to) return;
    setParams({ sectionId, from, to });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="section">Sección</Label>
          <select
            id="section"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
            className="flex h-10 w-48 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegir...</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit">Ver reporte</Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {error && <p className="text-sm text-destructive">No se pudo cargar el reporte.</p>}
      {rows?.map((row) => (
        <Card key={row.sectionId} className="space-y-1 py-3">
          <p className="text-lg font-medium">{row.attendanceRate}% de asistencia</p>
          <p className="text-sm text-muted-foreground">
            Presente: {row.presente} · Ausente: {row.ausente} · Tarde: {row.tarde} · Justificado:{' '}
            {row.justificado} · Total: {row.total}
          </p>
        </Card>
      ))}
    </div>
  );
}
