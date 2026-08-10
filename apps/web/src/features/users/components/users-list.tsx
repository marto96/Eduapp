'use client';

import { useUsers } from '../use-users';
import { Card } from '@/components/ui/card';

export function UsersList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>;
  if (!users || users.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay usuarios.</p>;
  }

  return (
    <ul className="space-y-2">
      {users.map((user) => (
        <Card key={user.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <span className="text-xs uppercase text-muted-foreground">{user.roles.join(', ')}</span>
        </Card>
      ))}
    </ul>
  );
}
