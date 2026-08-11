import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TenantsList } from '@/features/platform-tenants/components/tenants-list';

export default function PlatformTenantsPage() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instituciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nombre, color de marca y logo de cada colegio en la plataforma.
          </p>
        </div>
        <Link href="/platform/tenants/new">
          <Button>Nueva institución</Button>
        </Link>
      </div>

      <TenantsList />
    </main>
  );
}
