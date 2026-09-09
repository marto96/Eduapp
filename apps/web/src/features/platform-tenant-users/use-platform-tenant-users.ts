'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult, TenantUser } from '@eduapp/shared-types';

export interface PlatformTenantUsersFilter {
  tenantId: string;
  page: number;
  pageSize: number;
  search?: string;
}

async function fetchPlatformTenantUsers(
  filter: PlatformTenantUsersFilter,
): Promise<PaginatedResult<TenantUser>> {
  const params = new URLSearchParams();
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));
  if (filter.search) params.set('search', filter.search);

  const res = await fetch(`/api/platform/tenants/${filter.tenantId}/users?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
  return res.json();
}

export function usePlatformTenantUsers(filter: PlatformTenantUsersFilter) {
  return useQuery({
    queryKey: ['platform-tenant-users', filter],
    queryFn: () => fetchPlatformTenantUsers(filter),
    placeholderData: keepPreviousData,
  });
}

export interface CreatePlatformTenantUserInput {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

async function createPlatformTenantUser({
  tenantId,
  ...input
}: CreatePlatformTenantUserInput): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users`, {
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

export function useCreatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

export interface EditPlatformTenantUserInput {
  tenantId: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

async function editPlatformTenantUser({
  tenantId,
  id,
  ...input
}: EditPlatformTenantUserInput): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}`, {
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

export function useEditPlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editPlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

async function resetPlatformTenantUserPassword({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<{ temporaryPassword: string }> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/reset-password`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo resetear la contraseña');
  }
  return res.json();
}

export function useResetPlatformTenantUserPassword() {
  return useMutation({ mutationFn: resetPlatformTenantUserPassword });
}

async function deactivatePlatformTenantUser({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/deactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo inactivar el usuario');
  }
  return res.json();
}

export function useDeactivatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivatePlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}

async function reactivatePlatformTenantUser({
  tenantId,
  id,
}: {
  tenantId: string;
  id: string;
}): Promise<TenantUser> {
  const res = await fetch(`/api/platform/tenants/${tenantId}/users/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo reactivar el usuario');
  }
  return res.json();
}

export function useReactivatePlatformTenantUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactivatePlatformTenantUser,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['platform-tenant-users', { tenantId: variables.tenantId }] }),
  });
}
