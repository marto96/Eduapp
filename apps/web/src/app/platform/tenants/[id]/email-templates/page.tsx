import { PlatformTenantEmailTemplatesView } from '@/features/platform-tenant-email-templates/components/platform-tenant-email-templates-view';

export default function PlatformTenantEmailTemplatesPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantillas de correo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalizá el texto de los correos automáticos de esta institución.
        </p>
      </div>
      <PlatformTenantEmailTemplatesView tenantId={params.id} />
    </main>
  );
}
