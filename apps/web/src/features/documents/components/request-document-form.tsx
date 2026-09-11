'use client';

import { FormEvent, useState } from 'react';
import type { DeliveryMethod, DocumentType } from '@eduapp/shared-types';
import { useDocumentTypePrices, useRequestDocument } from '../use-document-requests';
import { usePaymentCheckout } from '@/features/finance/use-payment-checkout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';

const TYPES: { value: DocumentType; label: string }[] = [
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'certificado_notas', label: 'Certificado de notas' },
  { value: 'constancia_buena_conducta', label: 'Constancia de buena conducta' },
  { value: 'otro', label: 'Otro' },
];

export function RequestDocumentForm({ enrollmentId }: { enrollmentId: string }) {
  const { data: prices } = useDocumentTypePrices();
  const requestDocument = useRequestDocument();
  const checkout = usePaymentCheckout();

  const [type, setType] = useState<DocumentType>('constancia_matricula');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('digital');
  const [note, setNote] = useState('');

  const priceForType = prices?.find((p) => p.type === type)?.amount ?? 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    requestDocument.mutate(
      { enrollmentId, type, deliveryMethod, note: note || undefined },
      {
        onSuccess: (request) => {
          setNote('');
          if (request.chargeId) {
            checkout.mutate(request.chargeId);
          }
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
      <div className="space-y-1.5">
        <Label htmlFor="request-type">Tipo de documento</Label>
        <select
          id="request-type"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {priceForType > 0 ? `Costo: ${formatCurrency(priceForType)}` : 'Sin costo'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>¿Cómo lo necesitás?</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="deliveryMethod"
              checked={deliveryMethod === 'digital'}
              onChange={() => setDeliveryMethod('digital')}
            />
            PDF digital
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="deliveryMethod"
              checked={deliveryMethod === 'fisico'}
              onChange={() => setDeliveryMethod('fisico')}
            />
            Impreso (retirar en secretaría)
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="request-note">Nota (opcional)</Label>
        <input
          id="request-note"
          placeholder="Para trámite de..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <Button type="submit" disabled={requestDocument.isPending || checkout.isPending}>
        {priceForType > 0 ? 'Solicitar y pagar' : 'Solicitar'}
      </Button>
      {requestDocument.isError && (
        <p className="text-sm text-destructive">No se pudo enviar la solicitud.</p>
      )}
    </form>
  );
}
