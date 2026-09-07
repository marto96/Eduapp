'use client';

import { useState } from 'react';
import { useSendTestEmail } from './use-email-templates';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EmailTemplateType } from '@eduapp/shared-types';

export function TestEmailDialog({ type, onClose }: { type: EmailTemplateType; onClose: () => void }) {
  const [to, setTo] = useState('');
  const sendTest = useSendTestEmail();

  return (
    <Dialog open onClose={onClose} title="Enviar correo de prueba">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="test-email-to">Correo de destino</Label>
          <Input
            id="test-email-to"
            type="email"
            placeholder="vos@ejemplo.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Se envía con datos de ejemplo (nombre, código, montos ficticios), no con información real.
        </p>
        {sendTest.isSuccess && <p className="text-sm text-emerald-500">Correo enviado — revisá la bandeja de {to}.</p>}
        {sendTest.isError && <p className="text-sm text-destructive">{sendTest.error.message}</p>}
        <div className="flex gap-2">
          <Button
            disabled={!to || sendTest.isPending}
            onClick={() => sendTest.mutate({ type, to })}
          >
            {sendTest.isPending ? 'Enviando...' : 'Enviar prueba'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
