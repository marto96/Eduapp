'use client';

import { useState } from 'react';
import { useUsers, useResetUserPassword } from '../use-users';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function UsersList({ canManage = false }: { canManage?: boolean }) {
  const { data: users, isLoading, error } = useUsers();
  const resetPassword = useResetUserPassword();
  const [revealed, setRevealed] = useState<{ userId: string; password: string } | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>;
  if (!users || users.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay usuarios.</p>;
  }

  function handleReset(userId: string) {
    setRevealed(null);
    resetPassword.mutate(userId, {
      onSuccess: ({ temporaryPassword }) => setRevealed({ userId, password: temporaryPassword }),
    });
  }

  return (
    <ul className="space-y-2">
      {users.map((user) => (
        <Card key={user.id} className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-muted-foreground">
                {user.roles.join(', ')}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  disabled={resetPassword.isPending}
                  onClick={() => handleReset(user.id)}
                >
                  Resetear contraseña
                </button>
              )}
            </div>
          </div>
          {revealed?.userId === user.id && (
            <div className="mt-2 rounded border border-primary/40 bg-primary/5 p-2 text-xs">
              <p>
                Contraseña temporal: <span className="font-mono font-medium">{revealed.password}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Copiala ahora y comunicásela al usuario — no se va a volver a mostrar.
              </p>
              <button
                type="button"
                className="mt-1 underline"
                onClick={() => setRevealed(null)}
              >
                Cerrar
              </button>
            </div>
          )}
        </Card>
      ))}
    </ul>
  );
}
