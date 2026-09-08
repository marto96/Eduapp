import { redirect } from 'next/navigation';
import { getCurrentPlatformAdmin } from '@/lib/platform-api';
import { TwoFactorSettings } from '@/features/platform-security/components/two-factor-settings';

export default async function PlatformSecurityPage() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect('/platform/login');

  return (
    <main className="max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguridad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verificación en dos pasos para tu cuenta de superadmin.
        </p>
      </div>

      <TwoFactorSettings initialEnabled={admin.totpEnabled} />
    </main>
  );
}
