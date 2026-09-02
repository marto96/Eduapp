import { getTenantBranding } from '@/lib/server-api';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const branding = await getTenantBranding();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-1  justify-center text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.name}
              className="mb-2 h-10 max-w-[10rem] margin-auto "
              style={{
                display: 'block',
                margin: '0 auto',
              }}
            />
          ) : (
            <p className="mb-1 text-sm font-medium text-primary">{branding.name}</p>
          )}
          <h1 className="text-xl font-semibold">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">
            Accede a la plataforma de tu institución.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
