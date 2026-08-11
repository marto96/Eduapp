'use client';

import { ChangeEvent, useState } from 'react';
import { usePlatformTenant, useUploadPlatformTenantLogo } from '../use-platform-tenants';
import { Button } from '@/components/ui/button';

export function LogoUploadForm({ tenantId }: { tenantId: string }) {
  const { data: tenant } = usePlatformTenant(tenantId);
  const uploadLogo = useUploadPlatformTenantLogo();
  const [file, setFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function handleUpload() {
    if (!file) return;
    uploadLogo.mutate({ id: tenantId, file }, { onSuccess: () => setFile(null) });
  }

  return (
    <div className="flex items-center gap-4">
      {tenant?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tenant.logoUrl}
          alt={tenant.name}
          className="h-16 w-16 rounded border border-border object-contain"
        />
      )}
      <div className="space-y-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFileChange}
          className="text-sm"
        />
        <div>
          <Button type="button" disabled={!file || uploadLogo.isPending} onClick={handleUpload}>
            {uploadLogo.isPending ? 'Subiendo...' : 'Subir logo'}
          </Button>
        </div>
        {uploadLogo.isError && <p className="text-sm text-destructive">No se pudo subir el logo.</p>}
      </div>
    </div>
  );
}
