'use client';

import { FormEvent, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSendMessage } from '../use-messages';
import type { Message } from '@eduapp/shared-types';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

interface MessageThreadProps {
  partnerId: string;
  partnerName: string;
  currentUserId: string;
  messages: Message[];
}

export function MessageThread({ partnerId, partnerName, currentUserId, messages }: MessageThreadProps) {
  const sendMessage = useSendMessage();
  const [body, setBody] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate(
      { recipientId: partnerId, body },
      { onSuccess: () => setBody('') },
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="font-medium">{partnerName}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay mensajes. Escribí el primero.</p>
        )}
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded px-3 py-2 text-sm',
                  isMine ? 'bg-primary text-background' : 'bg-muted',
                )}
              >
                {message.body}
              </div>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                {formatDateTime(message.sentAt)}
                {isMine &&
                  (message.readAt ? (
                    <span className="text-primary" title={`Leído ${formatDateTime(message.readAt)}`}>
                      ✓✓
                    </span>
                  ) : (
                    <span title="Enviado">✓</span>
                  ))}
              </span>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          rows={2}
          placeholder="Escribí un mensaje..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
        />
        <Button type="submit" disabled={sendMessage.isPending || !body.trim()}>
          {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>
      {sendMessage.isError && (
        <p className="px-3 pb-2 text-sm text-destructive">No se pudo enviar el mensaje.</p>
      )}
    </div>
  );
}
