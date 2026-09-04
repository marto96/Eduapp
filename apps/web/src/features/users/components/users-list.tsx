'use client';

import { useEffect, useState } from 'react';
import { Ban, KeyRound, Pencil } from 'lucide-react';
import { useUsers, useResetUserPassword, useDeactivateUser, useReactivateUser } from '../use-users';
import { useGuardians } from '../use-guardians';
import { LinkGuardianModal } from './link-guardian-modal';
import { EditUserModal } from './edit-user-modal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { TenantUser } from '@eduapp/shared-types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_LABELS: Record<TenantUser['status'], string> = {
  active: 'Activo',
  invited: 'Invitado',
  suspended: 'Inactivo',
};

const STATUS_CLASSES: Record<TenantUser['status'], string> = {
  active: 'bg-primary/10 text-primary',
  invited: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/10 text-destructive',
};

export function UsersList({ canManage = false, canEdit = false }: { canManage?: boolean; canEdit?: boolean }) {
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
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const [revealed, setRevealed] = useState<{ userId: string; password: string } | null>(null);
  const { data: guardianLinks } = useGuardians();
  const [modalGuardian, setModalGuardian] = useState<{ id: string; name: string } | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<TenantUser | null>(null);

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

  function confirmDeactivate() {
    if (!deactivatingUser) return;
    deactivateUser.mutate(deactivatingUser.id, {
      onSuccess: () => setDeactivatingUser(null),
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
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[user.status]}`}>
                  {STATUS_LABELS[user.status]}
                </span>
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
                    title="Resetear contraseña"
                    aria-label="Resetear contraseña"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    disabled={resetPassword.isPending}
                    onClick={() => handleReset(user.id)}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    title="Editar usuario"
                    aria-label="Editar usuario"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canEdit && user.status === 'suspended' && (
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:text-primary/80"
                    disabled={reactivateUser.isPending}
                    onClick={() => reactivateUser.mutate(user.id)}
                  >
                    Reactivar
                  </button>
                )}
                {canEdit && user.status !== 'suspended' && (
                  <button
                    type="button"
                    title="Inactivar usuario"
                    aria-label="Inactivar usuario"
                    className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeactivatingUser(user)}
                  >
                    <Ban className="h-4 w-4" />
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
      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      <ConfirmDialog
        open={deactivatingUser !== null}
        onClose={() => {
          setDeactivatingUser(null);
          deactivateUser.reset();
        }}
        onConfirm={confirmDeactivate}
        title="Inactivar usuario"
        description={`¿Inactivar a ${deactivatingUser?.fullName}? Va a perder acceso a la plataforma hasta que lo reactives.`}
        confirmLabel="Inactivar"
        isConfirming={deactivateUser.isPending}
        errorMessage={deactivateUser.isError ? deactivateUser.error.message : undefined}
      />
    </div>
  );
}
