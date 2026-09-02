'use client';

import { FormEvent, useState } from 'react';
import { useAdmissionStatus } from '@/features/admissions/use-admissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_entrevista: 'Pendiente de entrevista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

export function AdmissionStatusLookup() {
  const [code, setCode] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const { data, isLoading, isError } = useAdmissionStatus(submittedCode);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmittedCode(code.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de seguimiento</Label>
          <Input
            id="code"
            placeholder="SOL-A8F3K2"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {isLoading ? 'Buscando...' : 'Consultar'}
        </Button>
      </form>

      {isError && <p className="text-sm text-destructive">No se encontró una solicitud con ese código.</p>}

      {data && (
        <div className="rounded border border-border p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Grado:</span> {data.gradeName}
          </p>
          <p>
            <span className="text-muted-foreground">Estado:</span>{' '}
            {STATUS_LABELS[data.status] ?? data.status}
          </p>
        </div>
      )}
    </div>
  );
}
