'use client';

import { useState } from 'react';
import { useEmployees } from '../use-employees';
import { useLeaves } from '../use-leaves';
import { CreateLeaveForm } from './create-leave-form';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CONTRACT_LABELS: Record<string, string> = {
  planta: 'Planta',
  contrato: 'Contrato',
  suplente: 'Suplente',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacaciones: 'Vacaciones',
  enfermedad: 'Enfermedad',
  personal: 'Personal',
  otro: 'Otro',
};

export function EmployeesList({ canManage }: { canManage: boolean }) {
  const { data: employees, isLoading, error } = useEmployees();
  const { data: users } = useUsers();
  const { data: leaves } = useLeaves();
  const [addingLeaveFor, setAddingLeaveFor] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los legajos.</p>;
  if (!employees || employees.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay legajos cargados.</p>;
  }

  const userNameById = new Map(users?.map((u) => [u.id, u.fullName]));

  return (
    <ul className="space-y-2">
      {employees.map((employee) => {
        const employeeLeaves = (leaves ?? []).filter((l) => l.employeeId === employee.id);

        return (
          <Card key={employee.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{userNameById.get(employee.userId) ?? employee.userId}</p>
                <p className="text-sm text-muted-foreground">
                  {employee.position} — {CONTRACT_LABELS[employee.contractType] ?? employee.contractType}{' '}
                  — ingreso {employee.hireDate}
                </p>
              </div>
              <span className="text-xs uppercase text-muted-foreground">{employee.status}</span>
            </div>

            {employeeLeaves.length > 0 && (
              <ul className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
                {employeeLeaves.map((leave) => (
                  <li key={leave.id}>
                    {LEAVE_TYPE_LABELS[leave.type] ?? leave.type}: {leave.startDate} — {leave.endDate}
                    {leave.reason ? ` (${leave.reason})` : ''}
                  </li>
                ))}
              </ul>
            )}

            {canManage &&
              (addingLeaveFor === employee.id ? (
                <CreateLeaveForm employeeId={employee.id} onDone={() => setAddingLeaveFor(null)} />
              ) : (
                <Button variant="ghost" onClick={() => setAddingLeaveFor(employee.id)}>
                  Cargar licencia
                </Button>
              ))}
          </Card>
        );
      })}
    </ul>
  );
}
