'use client';

import { useState } from 'react';
import type { DocumentRequestStatus, DocumentType } from '@eduapp/shared-types';
import { useDocumentRequests, useRejectDocumentRequest, useDeliverDocumentRequest } from '../use-document-requests';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Otro',
};

const STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  lista_para_imprimir: 'Lista para imprimir',
  lista: 'Lista (digital)',
  entregada: 'Entregada',
  rechazada: 'Rechazada',
};

export function DocumentRequestsQueue() {
  const [statusFilter, setStatusFilter] = useState<DocumentRequestStatus | undefined>('lista_para_imprimir');
  const { data: requests, isLoading } = useDocumentRequests(statusFilter);
  const reject = useRejectDocumentRequest();
  const deliver = useDeliverDocumentRequest();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([undefined, 'pendiente_pago', 'lista_para_imprimir', 'lista', 'entregada', 'rechazada'] as const).map(
          (status) => (
            <button
              key={status ?? 'todas'}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded px-3 py-1.5 text-sm ${
                statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {status ? STATUS_LABELS[status] : 'Todas'}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !requests || requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay solicitudes en este estado.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {DOCUMENT_TYPE_LABELS[r.type] ?? r.type} — {r.deliveryMethod === 'fisico' ? 'Físico' : 'Digital'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABELS[r.status]} · {new Date(r.requestedAt).toLocaleDateString('es-CO')}
                    {r.note ? ` · "${r.note}"` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'lista_para_imprimir' && (
                    <Button disabled={deliver.isPending} onClick={() => deliver.mutate(r.id)}>
                      Marcar entregado
                    </Button>
                  )}
                  {r.status === 'pendiente_pago' && (
                    <Button variant="secondary" onClick={() => setRejectingId(r.id)}>
                      Rechazar
                    </Button>
                  )}
                </div>
              </div>
              {rejectingId === r.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Motivo del rechazo"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="flex h-9 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <Button
                    disabled={!reason || reject.isPending}
                    onClick={() =>
                      reject.mutate(
                        { id: r.id, reason },
                        { onSuccess: () => { setRejectingId(null); setReason(''); } },
                      )
                    }
                  >
                    Confirmar
                  </Button>
                  <Button variant="ghost" onClick={() => setRejectingId(null)}>
                    Volver
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
