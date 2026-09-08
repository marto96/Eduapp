'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface SetupTotpResponse {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<SetupTotpResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setError(null);
    setLoading(true);
    const res = await fetch('/api/platform/auth/2fa/setup', { method: 'POST' });
    setLoading(false);

    if (!res.ok) {
      setError('No se pudo iniciar la configuración de 2FA.');
      return;
    }
    setSetup(await res.json());
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/platform/auth/2fa/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    setLoading(false);

    if (!res.ok) {
      setError('Código inválido — probá de nuevo.');
      return;
    }

    setEnabled(true);
    setSetup(null);
    setCode('');
  }

  if (enabled) {
    return (
      <Card className="p-4">
        <p className="text-sm">
          <span className="font-medium text-primary">2FA habilitado.</span> Cada inicio de sesión va a
          pedir un código de tu app de autenticación.
        </p>
      </Card>
    );
  }

  if (!setup) {
    return (
      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Todavía no tenés verificación en dos pasos configurada. Vas a necesitar una app de
          autenticación (Google Authenticator, Authy, 1Password, etc.).
        </p>
        <Button type="button" onClick={handleStartSetup} disabled={loading}>
          {loading ? 'Generando...' : 'Configurar 2FA'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">1. Escaneá este código con tu app de autenticación</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qrCodeDataUrl} alt="Código QR para configurar 2FA" className="h-40 w-40" />
        <p className="text-xs text-muted-foreground">
          ¿No podés escanear? Ingresá este código a mano:{' '}
          <code className="rounded bg-muted px-1 py-0.5">{setup.secret}</code>
        </p>
      </div>

      <div className="space-y-2 rounded border border-border p-3">
        <p className="text-sm font-medium">2. Guardá estos códigos de recuperación</p>
        <p className="text-xs text-muted-foreground">
          Se muestran una sola vez. Si perdés el celular, cada uno te deja entrar una vez en vez del
          código de la app.
        </p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
          {setup.recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode}>{recoveryCode}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleConfirm} className="space-y-2">
        <Label htmlFor="confirm-code">3. Confirmá con un código de la app</Label>
        <div className="flex gap-2">
          <Input
            id="confirm-code"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Confirmar'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Card>
  );
}
