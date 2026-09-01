'use client';

import Link from 'next/link';
import { usePlatformTenants } from '../use-platform-tenants';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function TenantsList() {
  const { data: tenants, isLoading, error } = usePlatformTenants();

  if (isLoading) return <LoadingState />;
  if (error) {
    return <p className="text-sm text-destructive">No se pudieron cargar las instituciones.</p>;
  }
  if (!tenants || tenants.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay instituciones.</p>;
  }

  return (
    <ul className="space-y-2">
      {tenants.map((tenant) => (
        <Link key={tenant.id} href={`/platform/tenants/${tenant.id}`} className="block">
          <Card className="flex items-center justify-between py-3 transition-colors hover:border-primary">
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded object-contain" />
              ) : (
                <div
                  className="h-8 w-8 shrink-0 rounded"
                  style={{ background: tenant.primaryColor ?? '#9184d9' }}
                />
              )}
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-muted-foreground">{tenant.subdomain}</p>
              </div>
            </div>
            <span className="text-xs uppercase text-muted-foreground">{tenant.status}</span>
          </Card>
        </Link>
      ))}
    </ul>
  );
}
