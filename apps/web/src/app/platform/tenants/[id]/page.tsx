import { EditTenantForm } from '@/features/platform-tenants/components/edit-tenant-form';
import { LogoUploadForm } from '@/features/platform-tenants/components/logo-upload-form';

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
    </main>
  );
}
