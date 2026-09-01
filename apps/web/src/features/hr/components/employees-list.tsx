'use client';

import { useState } from 'react';
import { useEmployees, useTerminateEmployee } from '../use-employees';
import { useLeaves, useCancelLeave } from '../use-leaves';
import { CreateLeaveForm } from './create-leave-form';
import { useUsers } from '@/features/users/use-users';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { LoadingState } from '@/components/ui/loading-state';

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
  const terminateEmployee = useTerminateEmployee();
  const cancelLeave = useCancelLeave();

  if (isLoading) return <LoadingState />;
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
                  {employee.salary != null ? ` — ${formatCurrency(employee.salary)}` : ''}
                </p>
              </div>
              <span className="text-xs uppercase text-muted-foreground">{employee.status}</span>
            </div>

            {employeeLeaves.length > 0 && (
              <ul className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
                {employeeLeaves.map((leave) => (
                  <li key={leave.id} className="flex items-center justify-between gap-2">
                    <span>
                      {LEAVE_TYPE_LABELS[leave.type] ?? leave.type}: {leave.startDate} — {leave.endDate}
                      {leave.reason ? ` (${leave.reason})` : ''}
                    </span>
                    {canManage && (
                      <Button
                        variant="ghost"
                        disabled={cancelLeave.isPending}
                        onClick={() => cancelLeave.mutate(leave.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage &&
              (addingLeaveFor === employee.id ? (
                <CreateLeaveForm employeeId={employee.id} onDone={() => setAddingLeaveFor(null)} />
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setAddingLeaveFor(employee.id)}>
                    Cargar licencia
                  </Button>
                  {employee.status === 'activo' && (
                    <Button
                      variant="ghost"
                      disabled={terminateEmployee.isPending}
                      onClick={() => terminateEmployee.mutate(employee.id)}
                    >
                      Dar de baja
                    </Button>
                  )}
                </div>
              ))}
          </Card>
        );
      })}
    </ul>
  );
}
