'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Message } from '@eduapp/shared-types';

async function fetchMessages(): Promise<Message[]> {
  const res = await fetch('/api/messages');
  if (!res.ok) throw new Error('No se pudieron cargar los mensajes');
  return res.json();
}

export interface SendMessageInput {
  recipientId: string;
  body: string;
}

async function sendMessage(input: SendMessageInput): Promise<Message> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('No se pudo enviar el mensaje');
  return res.json();
}

async function markMessageRead(id: string): Promise<Message> {
  const res = await fetch(`/api/messages/${id}/read`, { method: 'PATCH' });
  if (!res.ok) throw new Error('No se pudo marcar como leído');
  return res.json();
}

export interface EditMessageInput {
  id: string;
  body: string;
}

async function editMessage({ id, body }: EditMessageInput): Promise<Message> {
  const res = await fetch(`/api/messages/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error('No se pudo editar el mensaje');
  return res.json();
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/messages/unread-count');
  if (!res.ok) throw new Error('No se pudo obtener el conteo de no leídos');
  const data = await res.json();
  return data.count;
}

async function deleteMessage(id: string): Promise<void> {
  const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo eliminar el mensaje');
}

export interface UploadAttachmentInput {
  id: string;
  file: File;
}

async function uploadAttachment({ id, file }: UploadAttachmentInput): Promise<Message> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/messages/${id}/attachment`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('No se pudo subir el adjunto');
  return res.json();
}

export function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: fetchMessages,
  });
}

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['messages-unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMessageRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editMessage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

/**
 * Se suscribe al feed SSE de mensajes nuevos (ver `api/messages/stream`) e
 * invalida las queries relevantes al recibir un evento — reemplaza el
 * polling constante del hilo de mensajes. El polling de 20s en
 * `useUnreadMessagesCount` queda como fallback si esta conexión se cae.
 */
export function useMessagesStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource('/api/messages/stream');
    source.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    };
    return () => source.close();
  }, [queryClient]);
}
