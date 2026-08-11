import { CreateTenantForm } from '@/features/platform-tenants/components/create-tenant-form';

export default function NewPlatformTenantPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva institución</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El logo se sube después de crear la institución, desde su página de edición.
        </p>
      </div>

      <CreateTenantForm />
    </main>
  );
}
