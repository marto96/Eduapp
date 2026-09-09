'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { usePlatformTenants } from '../use-platform-tenants';
import { EditTenantModal } from './edit-tenant-modal';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function TenantsList() {
  const { data: tenants, isLoading, error } = usePlatformTenants();
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) {
    return <p className="text-sm text-destructive">No se pudieron cargar las instituciones.</p>;
  }
  if (!tenants || tenants.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay instituciones.</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="flex items-center justify-between py-3">
            <Link
              href={`/platform/tenants/${tenant.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-primary"
            >
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 shrink-0 rounded object-contain" />
              ) : (
                <div
                  className="h-8 w-8 shrink-0 rounded"
                  style={{ background: tenant.primaryColor ?? '#9184d9' }}
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{tenant.name}</p>
                <p className="truncate text-sm text-muted-foreground">{tenant.subdomain}</p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs uppercase text-muted-foreground">{tenant.status}</span>
              <button
                type="button"
                title="Editar institución"
                aria-label="Editar institución"
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setEditingTenantId(tenant.id)}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </ul>
      <EditTenantModal tenantId={editingTenantId} onClose={() => setEditingTenantId(null)} />
    </>
  );
}
