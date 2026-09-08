'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/platform/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError('Email o contraseña incorrectos.');
      return;
    }

    if (body?.needsTwoFactor) {
      setPendingToken(body.pendingToken);
      return;
    }

    router.push('/platform/tenants');
    router.refresh();
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/platform/auth/login/verify-2fa', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pendingToken, code }),
    });

    setLoading(false);

    if (!res.ok) {
      setError('Código inválido.');
      return;
    }

    router.push('/platform/tenants');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Administración de plataforma</h1>
          <p className="text-sm text-muted-foreground">
            Acceso exclusivo para superadministradores de Skolaria.
          </p>
        </div>

        {!pendingToken ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código de verificación</Label>
              <p className="text-xs text-muted-foreground">
                Ingresá el código de tu app de autenticación, o uno de tus códigos de recuperación.
              </p>
              <Input
                id="code"
                autoComplete="one-time-code"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPendingToken(null);
                setCode('');
                setError(null);
              }}
            >
              Volver
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
