'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useEditPlatformTenantUser } from '../use-platform-tenant-users';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantUser } from '@eduapp/shared-types';

const ROLES = [
  { value: 'admin_institucion', label: 'Admin institución' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
];

export function EditPlatformTenantUserModal({
  tenantId,
  user,
  onClose,
}: {
  tenantId: string;
  user: TenantUser | null;
  onClose: () => void;
}) {
  const editUser = useEditPlatformTenantUser();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('admin_institucion');

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.roles[0] ?? 'admin_institucion');
  }, [user]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    editUser.mutate(
      { tenantId, id: user.id, email, firstName, lastName, roles: [role] },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={user !== null} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editPlatformUserFirstName">Nombre</Label>
            <Input
              id="editPlatformUserFirstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editPlatformUserLastName">Apellido</Label>
            <Input
              id="editPlatformUserLastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPlatformUserEmail">Email</Label>
          <Input
            id="editPlatformUserEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editPlatformUserRole">Rol</Label>
          <select
            id="editPlatformUserRole"
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
          <Button type="submit" disabled={editUser.isPending}>
            {editUser.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {editUser.isError && <p className="text-sm text-destructive">{editUser.error.message}</p>}
      </form>
    </Dialog>
  );
}
