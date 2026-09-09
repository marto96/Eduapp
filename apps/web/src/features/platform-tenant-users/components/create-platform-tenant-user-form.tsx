'use client';

import { FormEvent, useState } from 'react';
import { useCreatePlatformTenantUser } from '../use-platform-tenant-users';
import { Dialog } from '@/components/ui/dialog';
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

export function CreatePlatformTenantUserForm({
  tenantId,
  open,
  onClose,
}: {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}) {
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
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Crear usuario">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="platformUserFirstName">Nombre</Label>
            <Input
              id="platformUserFirstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="platformUserLastName">Apellido</Label>
            <Input
              id="platformUserLastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
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
            className="flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando...' : 'Crear'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {createUser.isError && <p className="text-sm text-destructive">{createUser.error.message}</p>}
      </form>
    </Dialog>
  );
}
