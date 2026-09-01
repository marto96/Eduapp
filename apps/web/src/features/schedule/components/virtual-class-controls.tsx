'use client';

import { useState } from 'react';
import type { ClassCancellation, Schedule } from '@eduapp/shared-types';
import { useJoinVirtualClass } from '../use-schedules';
import { useCancelClassSession, useUncancelClassSession } from '../use-class-cancellations';
import { Button } from '@/components/ui/button';
import { todayLocalDate } from '@/lib/date';

export function VirtualClassControls({
  schedule,
  cancellation,
  canAct,
}: {
  schedule: Schedule;
  cancellation: ClassCancellation | undefined;
  canAct: boolean;
}) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const joinVirtualClass = useJoinVirtualClass();
  const cancelClassSession = useCancelClassSession();
  const uncancelClassSession = useUncancelClassSession();

  if (cancellation) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive"
            title={cancellation.reason ?? undefined}
          >
            Cancelada
          </span>
          {canAct && (
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              disabled={uncancelClassSession.isPending}
              onClick={() => uncancelClassSession.mutate(cancellation.id)}
            >
              Revertir
            </Button>
          )}
        </div>
        {uncancelClassSession.isError && (
          <p className="text-xs text-destructive">{(uncancelClassSession.error as Error).message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          className="h-8 px-3 text-xs"
          disabled={joinVirtualClass.isPending}
          onClick={() => {
            const win = window.open('', '_blank', 'noopener,noreferrer');
            joinVirtualClass.mutate(schedule.id, {
              onSuccess: (room) => {
                if (win) win.location.href = room.roomUrl;
              },
              onError: () => {
                win?.close();
              },
            });
          }}
        >
          Unirse
        </Button>
        {canAct && !showReasonInput && (
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setShowReasonInput(true)}>
            Cancelar clase de hoy
          </Button>
        )}
      </div>
      {joinVirtualClass.isError && (
        <p className="text-xs text-destructive">{(joinVirtualClass.error as Error).message}</p>
      )}
      {showReasonInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-8 w-48 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <Button
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={cancelClassSession.isPending}
            onClick={() =>
              cancelClassSession.mutate(
                { scheduleId: schedule.id, date: todayLocalDate(), reason: reason || undefined },
                { onSuccess: () => setShowReasonInput(false) },
              )
            }
          >
            Confirmar cancelación
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setShowReasonInput(false)}>
            Volver
          </Button>
        </div>
      )}
      {cancelClassSession.isError && (
        <p className="text-xs text-destructive">{(cancelClassSession.error as Error).message}</p>
      )}
    </div>
  );
}
