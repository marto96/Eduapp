'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePlatformTenant } from '../use-platform-tenants';
import { AVAILABLE_MODULES } from '../modules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_COLOR = '#9184d9';

export function CreateTenantForm() {
  const router = useRouter();
  const createTenant = useCreatePlatformTenant();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);
  const [enabledModules, setEnabledModules] = useState<string[]>(AVAILABLE_MODULES);

  function toggleModule(moduleName: string) {
    setEnabledModules((current) =>
      current.includes(moduleName)
        ? current.filter((m) => m !== moduleName)
        : [...current, moduleName],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createTenant.mutate(
      {
        name,
        subdomain,
        customDomain: customDomain || undefined,
        primaryColor,
        enabledModules,
      },
      {
        onSuccess: (tenant) => router.push(`/platform/tenants/${tenant.id}`),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subdomain">Subdominio</Label>
        <Input
          id="subdomain"
          required
          pattern="^[a-z][a-z0-9-]{1,30}$"
          title="Minúsculas, números y guiones, empezando con una letra"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        />
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

      <Button type="submit" disabled={createTenant.isPending}>
        {createTenant.isPending ? 'Creando...' : 'Crear institución'}
      </Button>
      {createTenant.isError && (
        <p className="text-sm text-destructive">No se pudo crear la institución.</p>
      )}
    </form>
  );
}
