'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useCreateEmployee } from '../use-employees';
import { useUsers } from '@/features/users/use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContractType } from '@eduapp/shared-types';

const STAFF_ROLES = ['docente', 'secretaria', 'directivo', 'admin_institucion'];

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'planta', label: 'Planta' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'suplente', label: 'Suplente' },
];

export function CreateEmployeeForm() {
  const { data: users } = useUsers();
  const createEmployee = useCreateEmployee();

  const [userId, setUserId] = useState('');
  const [position, setPosition] = useState('');
  const [contractType, setContractType] = useState<ContractType>('planta');
  const [hireDate, setHireDate] = useState('');

  const staffUsers = useMemo(
    () => (users ?? []).filter((u) => u.roles.some((role) => STAFF_ROLES.includes(role))),
    [users],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId || !position || !hireDate) return;
    createEmployee.mutate(
      { userId, position, contractType, hireDate },
      { onSuccess: () => setPosition('') },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="userId">Empleado</Label>
        <select
          id="userId"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex h-10 w-56 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="" disabled>
            Seleccioná un usuario
          </option>
          {staffUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.roles.join(', ')})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">Cargo</Label>
        <Input
          id="position"
          placeholder="Profesor de aula"
          required
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contractType">Contrato</Label>
        <select
          id="contractType"
          value={contractType}
          onChange={(e) => setContractType(e.target.value as ContractType)}
          className="flex h-10 w-32 rounded border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {CONTRACT_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hireDate">Ingreso</Label>
        <Input
          id="hireDate"
          type="date"
          className="w-40"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={createEmployee.isPending}>
        {createEmployee.isPending ? 'Creando...' : 'Crear legajo'}
      </Button>
      {createEmployee.isError && (
        <p className="w-full text-sm text-destructive">No se pudo crear el legajo.</p>
      )}
    </form>
  );
}
