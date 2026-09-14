import Link from 'next/link';
import { LogoUploadForm } from '@/features/platform-tenants/components/logo-upload-form';
import { PlatformTenantUsersList } from '@/features/platform-tenant-users/components/platform-tenant-users-list';
import { Button } from '@/components/ui/button';

export default function EditPlatformTenantPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-8 p-6">
      <div className="flex justify-end gap-2">
        <Link href={`/platform/tenants/${params.id}/email-templates`}>
          <Button variant="secondary">Ver plantillas de email</Button>
        </Link>
        <Link href={`/platform/tenants/${params.id}/audit`}>
          <Button variant="secondary">Ver auditoría</Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Logo</h2>
        <LogoUploadForm tenantId={params.id} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Crear, editar, desactivar/reactivar y resetear contraseñas de usuarios de esta institución.
          </p>
        </div>
        <PlatformTenantUsersList tenantId={params.id} />
      </section>
    </main>
  );
}
