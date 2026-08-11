'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@eduapp/shared-types';

export interface Conversation {
  partnerId: string;
  partnerName: string;
  messages: Message[];
  lastMessage: Message;
  unreadCount: number;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedPartnerId: string | null;
  onSelect: (partnerId: string) => void;
}

export function ConversationsList({ conversations, selectedPartnerId, onSelect }: ConversationsListProps) {
  if (conversations.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">Todavía no tenés conversaciones.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conversation) => (
        <li key={conversation.partnerId}>
          <button
            type="button"
            onClick={() => onSelect(conversation.partnerId)}
            className={cn(
              'flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted/50',
              selectedPartnerId === conversation.partnerId && 'bg-muted',
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 font-medium">
              {conversation.partnerName}
              {conversation.unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-background">
                  {conversation.unreadCount}
                </span>
              )}
            </span>
            <span className="line-clamp-1 w-full text-muted-foreground">
              {conversation.lastMessage.body}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
