'use client';

import { EditTenantForm } from './edit-tenant-form';
import { Dialog } from '@/components/ui/dialog';

export function EditTenantModal({
  tenantId,
  onClose,
}: {
  tenantId: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={tenantId !== null} onClose={onClose} title="Editar institución" className="max-w-2xl">
      {tenantId && <EditTenantForm tenantId={tenantId} onSuccess={onClose} />}
    </Dialog>
  );
}
