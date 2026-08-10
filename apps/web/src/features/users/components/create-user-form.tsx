'use client';

import { FormEvent, useState } from 'react';
import { useCreateUser } from '../use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLES = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'padre_tutor', label: 'Padre/tutor' },
  { value: 'docente', label: 'Docente' },
  { value: 'secretaria', label: 'Secretaría' },
  { value: 'directivo', label: 'Directivo' },
  { value: 'admin_institucion', label: 'Admin institución' },
];

export function CreateUserForm() {
  const createUser = useCreateUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('estudiante');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createUser.mutate(
      { email, password, firstName, lastName, roles: [role] },
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
        <Label htmlFor="firstName">Nombre</Label>
        <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lastName">Apellido</Label>
        <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
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
      {createUser.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el usuario.</p>
      )}
    </form>
  );
}
