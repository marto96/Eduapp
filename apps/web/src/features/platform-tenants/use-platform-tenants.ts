'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlatformTenant } from '@eduapp/shared-types';

async function fetchTenants(): Promise<PlatformTenant[]> {
  const res = await fetch('/api/platform/tenants');
  if (!res.ok) throw new Error('No se pudieron cargar las instituciones');
  return res.json();
}

async function fetchTenant(id: string): Promise<PlatformTenant> {
  const res = await fetch(`/api/platform/tenants/${id}`);
  if (!res.ok) throw new Error('No se pudo cargar la institución');
  return res.json();
}

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  customDomain?: string;
  enabledModules?: string[];
  primaryColor?: string;
}

async function createTenant(input: CreateTenantInput): Promise<PlatformTenant> {
  const res = await fetch('/api/platform/tenants', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear la institución');
  return res.json();
}

export interface UpdateTenantInput {
  id: string;
  name?: string;
  customDomain?: string;
  enabledModules?: string[];
  primaryColor?: string;
}

async function updateTenant({ id, ...body }: UpdateTenantInput): Promise<PlatformTenant> {
  const res = await fetch(`/api/platform/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('No se pudo editar la institución');
  return res.json();
}

async function uploadTenantLogo({ id, file }: { id: string; file: File }): Promise<PlatformTenant> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(`/api/platform/tenants/${id}/logo`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('No se pudo subir el logo');
  return res.json();
}

export function usePlatformTenants() {
  return useQuery({ queryKey: ['platform-tenants'], queryFn: fetchTenants });
}

export function usePlatformTenant(id: string) {
  return useQuery({ queryKey: ['platform-tenants', id], queryFn: () => fetchTenant(id) });
}

export function useCreatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] }),
  });
}

export function useUpdatePlatformTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTenant,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenants', tenant.id] });
    },
  });
}

export function useUploadPlatformTenantLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadTenantLogo,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenants', tenant.id] });
    },
  });
}
