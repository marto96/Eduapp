'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Mail, Shield, CreditCard } from 'lucide-react';
import { useEditUser } from '../use-users';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { IdentityCard } from '@/components/ui/identity-card';
import { getInitials, formatRoles } from '@/lib/roles';
import { STATUS_LABELS, STATUS_DOT_CLASSES } from '@/lib/user-status';
import type { TenantUser } from '@eduapp/shared-types';

const ROLES = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'admin_institucion', label: 'Admin institución' },
];

export function EditUserModal({ user, onClose }: { user: TenantUser | null; onClose: () => void }) {
  const editUser = useEditUser();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('estudiante');

  useEffect(() => {
    if (!user) return;
    setEmail(user.email);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.roles[0] ?? 'estudiante');
  }, [user]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    editUser.mutate(
      { id: user.id, email, firstName, lastName, roles: [role] },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={user !== null} onClose={onClose} title="Editar usuario">
      {user && (
        <IdentityCard
          className="border-b border-border pb-4"
          avatar={<Avatar initials={getInitials(user.fullName)} alt={user.fullName} />}
          name={user.fullName}
          status={{ label: STATUS_LABELS[user.status], dotClassName: STATUS_DOT_CLASSES[user.status] }}
          rows={[
            { icon: Mail, text: user.email },
            { icon: Shield, text: formatRoles(user.roles) },
            ...(user.documentNumber
              ? [{ icon: CreditCard, text: `${user.documentType ?? ''} ${user.documentNumber}`.trim() }]
              : []),
          ]}
        />
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editFirstName">Nombre</Label>
            <Input id="editFirstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="editLastName">Apellido</Label>
            <Input id="editLastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editEmail">Email</Label>
          <Input
            id="editEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="editRole">Rol</Label>
          <select
            id="editRole"
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
