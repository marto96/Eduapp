import { CreateEmployeeForm } from '@/features/hr/components/create-employee-form';
import { EmployeesList } from '@/features/hr/components/employees-list';
import { getCurrentUser } from '@/lib/server-api';
import { canManageHr } from '@/lib/permissions';

export default async function HrPage() {
  const user = await getCurrentUser();
  const canManage = canManageHr(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RRHH</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Legajo de personal docente y administrativo, y sus licencias.
        </p>
      </div>

      {canManage ? (
        <>
          <CreateEmployeeForm />
          <EmployeesList canManage={canManage} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No tenés acceso a esta sección.</p>
      )}
    </main>
  );
}
