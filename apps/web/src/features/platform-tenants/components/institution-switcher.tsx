'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePlatformTenants } from '../use-platform-tenants';

/**
 * Selector para saltar directo a la edición de una institución — repone el
 * dropdown de instituciones que traía el mockup original (`EduDash.dc.html`,
 * ahí era un selector fake sin datos reales detrás) ahora que sí hay una
 * lista real de tenants para poblarlo.
 */
export function InstitutionSwitcher() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { data: tenants } = usePlatformTenants();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const id = event.target.value;
    if (id) router.push(`/platform/tenants/${id}`);
  }

  return (
    <select
      value={params?.id ?? ''}
      onChange={handleChange}
      className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
    >
      <option value="">Cambiar de institución...</option>
      {tenants?.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name} ({tenant.subdomain})
        </option>
      ))}
    </select>
  );
}
