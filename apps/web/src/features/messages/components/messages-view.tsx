'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMessages, useMarkMessageRead } from '../use-messages';
import { useUsers } from '@/features/users/use-users';
import { ConversationsList, type Conversation } from './conversations-list';
import { MessageThread } from './message-thread';
import { Label } from '@/components/ui/label';
import type { Message } from '@eduapp/shared-types';

interface MessagesViewProps {
  currentUserId: string;
}

export function MessagesView({ currentUserId }: MessagesViewProps) {
  const { data: messages } = useMessages();
  const { data: users } = useUsers();
  const markMessageRead = useMarkMessageRead();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const userNameById = useMemo(() => new Map(users?.map((u) => [u.id, u.fullName])), [users]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!messages) return [];
    const byPartner = new Map<string, Message[]>();
    for (const message of messages) {
      const partnerId = message.senderId === currentUserId ? message.recipientId : message.senderId;
      const list = byPartner.get(partnerId) ?? [];
      list.push(message);
      byPartner.set(partnerId, list);
    }
    return Array.from(byPartner.entries())
      .map(([partnerId, msgs]) => ({
        partnerId,
        partnerName: userNameById.get(partnerId) ?? partnerId,
        messages: msgs,
        lastMessage: msgs[msgs.length - 1],
        unreadCount: msgs.filter((m) => !m.readAt && m.recipientId === currentUserId).length,
      }))
      .sort((a, b) => b.lastMessage.sentAt.localeCompare(a.lastMessage.sentAt));
  }, [messages, userNameById, currentUserId]);

  const selectedConversation = conversations.find((c) => c.partnerId === selectedPartnerId);

  useEffect(() => {
    if (!selectedConversation) return;
    const unread = selectedConversation.messages.filter(
      (m) => !m.readAt && m.recipientId === currentUserId,
    );
    unread.forEach((m) => markMessageRead.mutate(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartnerId]);

  const otherUsers = (users ?? []).filter((u) => u.id !== currentUserId);
  const partnersWithConversation = new Set(conversations.map((c) => c.partnerId));

  return (
    <div className="flex h-[70vh] overflow-hidden rounded border border-border">
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="space-y-1.5 border-b border-border p-3">
          <Label htmlFor="new-conversation">Nueva conversación</Label>
          <select
            id="new-conversation"
            value=""
            onChange={(e) => e.target.value && setSelectedPartnerId(e.target.value)}
            className="flex h-9 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Elegir persona...</option>
            {otherUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
                {partnersWithConversation.has(u.id) ? '' : ' (nuevo)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationsList
            conversations={conversations}
            selectedPartnerId={selectedPartnerId}
            onSelect={setSelectedPartnerId}
          />
        </div>
      </div>
      <div className="flex-1">
        {selectedPartnerId ? (
          <MessageThread
            partnerId={selectedPartnerId}
            partnerName={userNameById.get(selectedPartnerId) ?? selectedPartnerId}
            currentUserId={currentUserId}
            messages={selectedConversation?.messages ?? []}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Elegí una conversación o iniciá una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
