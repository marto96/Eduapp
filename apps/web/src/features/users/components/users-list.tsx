'use client';

import { useEffect, useState } from 'react';
import { useUsers, useResetUserPassword } from '../use-users';
import { useGuardians } from '../use-guardians';
import { LinkGuardianModal } from './link-guardian-modal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

export function UsersList({ canManage = false }: { canManage?: boolean }) {
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const timeout = setTimeout(() => setCommittedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [committedSearch, pageSize]);

  const { data, isLoading, error } = useUsers({ page, pageSize, search: committedSearch || undefined });
  const users = data?.items;
  const resetPassword = useResetUserPassword();
  const [revealed, setRevealed] = useState<{ userId: string; password: string } | null>(null);
  const { data: guardianLinks } = useGuardians();
  const [modalGuardian, setModalGuardian] = useState<{ id: string; name: string } | null>(null);

  const filters = (
    <Input
      placeholder="Buscar por nombre o email..."
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      className="w-72"
    />
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>
      </div>
    );
  }
  if (!users || users.length === 0) {
    return (
      <div className="space-y-3">
        {filters}
        <p className="text-sm text-muted-foreground">
          {committedSearch ? 'No hay usuarios que coincidan con la búsqueda.' : 'Todavía no hay usuarios.'}
        </p>
      </div>
    );
  }

  function handleReset(userId: string) {
    setRevealed(null);
    resetPassword.mutate(userId, {
      onSuccess: ({ temporaryPassword }) => setRevealed({ userId, password: temporaryPassword }),
    });
  }

  return (
    <div className="space-y-3">
      {filters}
      <ul className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
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
                {canManage && user.roles.includes('padre_tutor') && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => setModalGuardian({ id: user.id, name: user.fullName })}
                  >
                    {(() => {
                      const count = guardianLinks?.filter((l) => l.guardianUserId === user.id).length ?? 0;
                      return count > 0 ? `Gestionar vínculos (${count})` : 'Vincular estudiante';
                    })()}
                  </button>
                )}
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
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      )}
      <LinkGuardianModal
        guardianUserId={modalGuardian?.id ?? null}
        guardianName={modalGuardian?.name ?? ''}
        onClose={() => setModalGuardian(null)}
      />
    </div>
  );
}
