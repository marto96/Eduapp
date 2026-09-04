'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { AdmissionStatus } from '@eduapp/shared-types';
import {
  useAdmissionApplications,
  useRecordAdmissionInterview,
  useAcceptAdmissionApplication,
  useRejectAdmissionApplication,
} from '../use-admissions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_entrevista: 'Pendiente de entrevista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

/** Si el término de búsqueda es exactamente el nombre (o el valor crudo) de un estado, se busca por estado en vez de texto libre — así "aceptada" filtra por estado en el mismo cuadro de búsqueda. */
function matchStatusLabel(term: string): AdmissionStatus | undefined {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return undefined;
  const entry = Object.entries(STATUS_LABELS).find(
    ([status, label]) => status === normalized || label.toLowerCase() === normalized,
  );
  return entry?.[0] as AdmissionStatus | undefined;
}

export function AdmissionApplicationsList() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [committedSearch, pageSize]);

  const statusFromSearch = useMemo(() => matchStatusLabel(committedSearch), [committedSearch]);

  const { data, isLoading, error } = useAdmissionApplications({
    page,
    pageSize,
    status: statusFromSearch,
    search: statusFromSearch ? undefined : committedSearch || undefined,
  });
  const applications = data?.items;
  const recordInterview = useRecordAdmissionInterview();
  const acceptApplication = useAcceptAdmissionApplication();
  const rejectApplication = useRejectAdmissionApplication();

  const [interviewingId, setInterviewingId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const filters = (
    <Input
      placeholder="Buscar por código, nombre o estado..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className="w-72"
    />
  );

  const pageSizeControl = (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
      {PAGE_SIZE_OPTIONS.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => setPageSize(size)}
          className={cn(
            'rounded px-2 py-1 text-xs font-medium transition-colors',
            pageSize === size
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {size}
        </button>
      ))}
    </div>
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-destructive">No se pudieron cargar las solicitudes.</p>
      </div>
    );
  }
  if (!applications || applications.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay solicitudes que coincidan con la búsqueda.' : 'Todavía no hay solicitudes.'}
        </p>
      </div>
    );
  }

  function saveInterview(id: string) {
    if (!interviewDate) return;
    recordInterview.mutate(
      { id, interviewDate, interviewNotes: interviewNotes || undefined },
      { onSuccess: () => setInterviewingId(null) },
    );
  }

  async function handleAccept(id: string) {
    try {
      const result = await acceptApplication.mutateAsync(id);
      // El estudiante nuevo/de regreso se termina de matricular desde la
      // página de Matrícula, pre-cargada con los datos de esta solicitud.
      // Esos datos son PII del menor (nombre, documento, dirección) — no
      // deben viajar por la URL (historial del navegador, header Referer,
      // logs de acceso): se guardan en sessionStorage y solo el id de la
      // solicitud (y el matchedUserId, que no es sensible) cruza por query
      // param hacia la Server Component page.
      sessionStorage.setItem(`admission-prefill-${id}`, JSON.stringify(result.prefill));
      const params = new URLSearchParams({ admissionId: id });
      if (result.matchedUserId) params.set('matchedUserId', result.matchedUserId);
      router.push(`/enrollment?${params.toString()}`);
    } catch {
      // El error ya se muestra vía el toast global (ver app/providers.tsx).
    }
  }

  function saveReject(id: string) {
    if (!rejectionReason.trim()) return;
    rejectApplication.mutate({ id, rejectionReason }, { onSuccess: () => setRejectingId(null) });
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="space-y-2">
      {applications.map((application) => (
        <Card key={application.id} className="space-y-2 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {application.studentFirstName} {application.studentLastName}
              </p>
              <p className="text-xs text-muted-foreground">{application.trackingCode}</p>
            </div>
            <span className="text-xs uppercase text-muted-foreground">
              {STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>

          {application.status === 'pendiente_entrevista' && (
            <div className="flex flex-wrap items-center gap-2">
              {interviewingId === application.id ? (
                <>
                  <Input
                    type="datetime-local"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-48"
                  />
                  <Input
                    placeholder="Notas (opcional)"
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    className="w-56"
                  />
                  <Button type="button" onClick={() => saveInterview(application.id)}>
                    Guardar entrevista
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setInterviewingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInterviewingId(application.id);
                    setInterviewDate(application.interviewDate?.slice(0, 16) ?? '');
                    setInterviewNotes(application.interviewNotes ?? '');
                  }}
                >
                  {application.interviewDate ? 'Editar entrevista' : 'Registrar entrevista'}
                </Button>
              )}

              {rejectingId === application.id ? (
                <>
                  <Input
                    placeholder="Motivo del rechazo"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-56"
                  />
                  <Button type="button" variant="ghost" onClick={() => saveReject(application.id)}>
                    Confirmar rechazo
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRejectingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setRejectingId(application.id)}>
                  Rechazar
                </Button>
              )}

              <Button type="button" onClick={() => handleAccept(application.id)}>
                Aceptar
              </Button>
            </div>
          )}

          {application.status === 'rechazada' && application.rejectionReason && (
            <p className="text-sm text-muted-foreground">Motivo: {application.rejectionReason}</p>
          )}
        </Card>
      ))}
      </ul>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {page} de {totalPages} · {data?.total} solicitud{data?.total === 1 ? '' : 'es'}
        </span>
        <div className="flex items-center gap-2">
          {pageSizeControl}
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
