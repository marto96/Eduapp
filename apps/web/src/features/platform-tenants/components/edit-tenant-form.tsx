'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePlatformTenant, useUpdatePlatformTenant } from '../use-platform-tenants';
import { AVAILABLE_MODULES } from '../modules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';

export function EditTenantForm({ tenantId }: { tenantId: string }) {
  const { data: tenant, isLoading, error } = usePlatformTenant(tenantId);
  const updateTenant = useUpdatePlatformTenant();

  const [name, setName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#9184d9');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setCustomDomain(tenant.customDomain ?? '');
    setPrimaryColor(tenant.primaryColor ?? '#9184d9');
    setEnabledModules(tenant.enabledModules);
  }, [tenant]);

  function toggleModule(moduleName: string) {
    setEnabledModules((current) =>
      current.includes(moduleName)
        ? current.filter((m) => m !== moduleName)
        : [...current, moduleName],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateTenant.mutate({
      id: tenantId,
      name,
      customDomain: customDomain || undefined,
      primaryColor,
      enabledModules,
    });
  }

  if (isLoading) return <LoadingState />;
  if (error || !tenant) {
    return <p className="text-sm text-destructive">No se pudo cargar la institución.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label>Subdominio</Label>
        <p className="text-sm text-muted-foreground">{tenant.subdomain} (no editable)</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customDomain">Dominio propio (opcional)</Label>
        <Input
          id="customDomain"
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="primaryColor">Color de marca</Label>
        <div className="flex items-center gap-2">
          <input
            id="primaryColor"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-14 rounded border border-border bg-background"
          />
          <Input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-32"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Módulos habilitados</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {AVAILABLE_MODULES.map((moduleName) => (
            <label key={moduleName} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={enabledModules.includes(moduleName)}
                onChange={() => toggleModule(moduleName)}
              />
              {moduleName}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={updateTenant.isPending}>
        {updateTenant.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
      {updateTenant.isError && (
        <p className="text-sm text-destructive">No se pudo guardar la institución.</p>
      )}
      {updateTenant.isSuccess && <p className="text-sm text-muted-foreground">Guardado.</p>}
    </form>
  );
}
