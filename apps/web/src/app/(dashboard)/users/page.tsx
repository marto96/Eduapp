import { UsersList } from '@/features/users/components/users-list';
import { CreateUserForm } from '@/features/users/components/create-user-form';
import { getCurrentUser } from '@/lib/server-api';
import { canManageUsers } from '@/lib/permissions';

export default async function UsersPage() {
  const user = await getCurrentUser();
  const canManage = canManageUsers(user?.roles ?? []);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estudiantes, docentes y demás usuarios de la institución.
        </p>
      </div>

      {canManage && <CreateUserForm />}
      <UsersList />
    </main>
  );
}
