'use client';

import { FormEvent, useState } from 'react';
import { useRecordPayment } from '../use-payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayLocalDate } from '@/lib/date';
import type { PaymentMethod } from '@eduapp/shared-types';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export function RecordPaymentForm({
  chargeId,
  balance,
  onDone,
}: {
  chargeId: string;
  balance: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [paidAt, setPaidAt] = useState(todayLocalDate);
  const [reference, setReference] = useState('');
  const recordPayment = useRecordPayment();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!amount || !paidAt) return;
    recordPayment.mutate(
      { chargeId, amount: Number(amount), method, paidAt, reference: reference || undefined },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
      <div className="space-y-1.5">
        <Label htmlFor={`amount-${chargeId}`}>Monto</Label>
        <Input
          id={`amount-${chargeId}`}
          type="number"
          min={0.01}
          max={balance}
          step="0.01"
          className="w-28"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`method-${chargeId}`}>Método</Label>
        <select
          id={`method-${chargeId}`}
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`paidAt-${chargeId}`}>Fecha</Label>
        <Input
          id={`paidAt-${chargeId}`}
          type="date"
          className="w-40"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`reference-${chargeId}`}>Referencia</Label>
        <Input
          id={`reference-${chargeId}`}
          placeholder="Opcional"
          className="w-32"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={recordPayment.isPending}>
        {recordPayment.isPending ? 'Registrando...' : 'Registrar pago'}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone}>
        Cancelar
      </Button>
      {recordPayment.isError && (
        <p className="w-full text-sm text-destructive">
          No se pudo registrar el pago (¿excede el saldo pendiente?).
        </p>
      )}
    </form>
  );
}
