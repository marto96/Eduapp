'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export interface UsersFilter {
  role?: string;
  search?: string;
}

export interface PaginatedUsersFilter extends UsersFilter {
  page: number;
  pageSize: number;
}

async function fetchUsers(
  filter: UsersFilter | PaginatedUsersFilter,
): Promise<TenantUser[] | PaginatedResult<TenantUser>> {
  const params = new URLSearchParams();
  if (filter.role) params.set('role', filter.role);
  if (filter.search) params.set('search', filter.search);
  if ('page' in filter) params.set('page', String(filter.page));
  if ('pageSize' in filter) params.set('pageSize', String(filter.pageSize));
  const qs = params.toString();

  const res = await fetch(`/api/users${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
  return res.json();
}

export type DocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PA';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
}

async function createUser(input: CreateUserInput): Promise<TenantUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo crear el usuario');
  }
  return res.json();
}

export function useUsers(role?: string): ReturnType<typeof useQuery<TenantUser[]>>;
export function useUsers(filter: UsersFilter): ReturnType<typeof useQuery<TenantUser[]>>;
export function useUsers(
  filter: PaginatedUsersFilter,
): ReturnType<typeof useQuery<PaginatedResult<TenantUser>>>;
export function useUsers(arg?: string | UsersFilter | PaginatedUsersFilter) {
  const filter: UsersFilter | PaginatedUsersFilter = typeof arg === 'string' ? { role: arg } : (arg ?? {});
  return useQuery({
    queryKey: ['users', filter],
    queryFn: () => fetchUsers(filter),
    // Cada término de búsqueda distinto es una query-key nueva (nunca antes
    // vista), así que sin esto `isLoading` se prendía en cada tecla y
    // `UsersList` desmontaba todo el árbol (incluido el input) para mostrar
    // el spinner — el input perdía foco/hover en cada carácter escrito.
    placeholderData: keepPreviousData,
  });
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

export interface EditUserInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
}

async function editUser({ id, ...input }: EditUserInput): Promise<TenantUser> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo editar el usuario');
  }
  return res.json();
}

export function useEditUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

async function deactivateUser(id: string): Promise<TenantUser> {
  const res = await fetch(`/api/users/${id}/deactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo inactivar el usuario');
  }
  return res.json();
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

async function reactivateUser(id: string): Promise<TenantUser> {
  const res = await fetch(`/api/users/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo reactivar el usuario');
  }
  return res.json();
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}
