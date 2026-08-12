'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TenantUser } from '@eduapp/shared-types';

async function fetchUsers(role?: string): Promise<TenantUser[]> {
  const url = role ? `/api/users?role=${encodeURIComponent(role)}` : '/api/users';
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
  return res.json();
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

async function createUser(input: CreateUserInput): Promise<TenantUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el usuario');
  return res.json();
}

export function useUsers(role?: string) {
  return useQuery({ queryKey: ['users', role ?? 'all'], queryFn: () => fetchUsers(role) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

async function resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  const res = await fetch(`/api/users/${id}/reset-password`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo resetear la contraseña');
  return res.json();
}

export function useResetUserPassword() {
  return useMutation({ mutationFn: resetUserPassword });
}
