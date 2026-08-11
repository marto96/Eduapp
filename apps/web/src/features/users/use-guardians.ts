'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GuardianLink } from '@eduapp/shared-types';

async function fetchGuardians(): Promise<GuardianLink[]> {
  const res = await fetch('/api/guardians');
  if (!res.ok) throw new Error('No se pudieron cargar los vínculos');
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

export function useGuardians() {
  return useQuery({ queryKey: ['guardians'], queryFn: fetchGuardians });
}

export function useLinkGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkGuardian,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] }),
  });
}
