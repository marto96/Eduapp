import { EditTenantForm } from '@/features/platform-tenants/components/edit-tenant-form';
import { LogoUploadForm } from '@/features/platform-tenants/components/logo-upload-form';
import { CreatePlatformTenantUserForm } from '@/features/platform-tenant-users/components/create-platform-tenant-user-form';
import { PlatformTenantUsersList } from '@/features/platform-tenant-users/components/platform-tenant-users-list';

export default function EditPlatformTenantPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar institución</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nombre, color de marca, dominio y módulos habilitados.
        </p>
      </div>

      <EditTenantForm tenantId={params.id} />

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
        <CreatePlatformTenantUserForm tenantId={params.id} />
        <PlatformTenantUsersList tenantId={params.id} />
      </section>
    </main>
  );
}
