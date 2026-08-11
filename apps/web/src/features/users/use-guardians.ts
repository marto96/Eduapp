'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GuardianLink } from '@eduapp/shared-types';

async function fetchGuardians(): Promise<GuardianLink[]> {
  const res = await fetch('/api/guardians');
  if (!res.ok) throw new Error('No se pudieron cargar los vínculos');
  return res.json();
}

async function fetchMyGuardianLinks(): Promise<GuardianLink[]> {
  const res = await fetch('/api/guardians/mine');
  if (!res.ok) throw new Error('No se pudieron cargar tus vínculos');
  return res.json();
}

export interface LinkGuardianInput {
  guardianUserId: string;
  studentUserId: string;
}

async function linkGuardian(input: LinkGuardianInput): Promise<GuardianLink> {
  const res = await fetch('/api/guardians', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo crear el vínculo');
  return res.json();
}

export interface RequestGuardianLinkInput {
  studentUserId: string;
}

async function requestGuardianLink(input: RequestGuardianLinkInput): Promise<GuardianLink> {
  const res = await fetch('/api/guardians/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo enviar la solicitud');
  return res.json();
}

async function approveGuardianLink(id: string): Promise<GuardianLink> {
  const res = await fetch(`/api/guardians/${id}/approve`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo aprobar el vínculo');
  return res.json();
}

export function useGuardians() {
  return useQuery({ queryKey: ['guardians'], queryFn: fetchGuardians });
}

export function useMyGuardianLinks() {
  return useQuery({ queryKey: ['my-guardians'], queryFn: fetchMyGuardianLinks });
}

export function useLinkGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkGuardian,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] }),
  });
}

export function useRequestGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestGuardianLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['my-guardians'] });
    },
  });
}

export function useApproveGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveGuardianLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] }),
  });
}
