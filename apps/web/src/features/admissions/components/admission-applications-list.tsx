'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_entrevista: 'Pendiente de entrevista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

export function AdmissionApplicationsList() {
  const router = useRouter();
  const { data: applications, isLoading, error } = useAdmissionApplications();
  const recordInterview = useRecordAdmissionInterview();
  const acceptApplication = useAcceptAdmissionApplication();
  const rejectApplication = useRejectAdmissionApplication();

  const [interviewingId, setInterviewingId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar las solicitudes.</p>;
  if (!applications || applications.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay solicitudes.</p>;
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
  );
}
