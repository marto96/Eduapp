'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUser } from '@eduapp/shared-types';

async function fetchMyProfile(): Promise<AuthenticatedUser | null> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export function useMyProfile() {
  return useQuery({ queryKey: ['my-profile'], queryFn: fetchMyProfile });
}

export interface EditMyProfileInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  documentType?: string;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

async function editMyProfile(input: EditMyProfileInput): Promise<void> {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'No se pudo actualizar el perfil');
  }
}

export function useEditMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

async function uploadMyProfilePhoto(file: File): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/auth/me/photo', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('No se pudo subir la foto');
  return res.json();
}

export function useUploadMyProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMyProfilePhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}
