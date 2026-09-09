'use client';

import { FormEvent, useState } from 'react';
import { useCreatePlatformTenantUser } from '../use-platform-tenant-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLES = [
  { value: 'admin_institucion', label: 'Admin institución' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
];

export function CreatePlatformTenantUserForm({ tenantId }: { tenantId: string }) {
  const createUser = useCreatePlatformTenantUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('admin_institucion');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createUser.mutate(
      { tenantId, email, password, firstName, lastName, roles: [role] },
      {
        onSuccess: () => {
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="platformUserFirstName">Nombre</Label>
        <Input id="platformUserFirstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserLastName">Apellido</Label>
        <Input id="platformUserLastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserEmail">Email</Label>
        <Input
          id="platformUserEmail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserPassword">Contraseña</Label>
        <Input
          id="platformUserPassword"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="platformUserRole">Rol</Label>
        <select
          id="platformUserRole"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-40 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creando...' : 'Crear'}
      </Button>
      {createUser.isError && <p className="w-full text-sm text-destructive">{createUser.error.message}</p>}
    </form>
  );
}
