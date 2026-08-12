import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type Redis from 'ioredis';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { MessagingPolicyService } from '../services/messaging-policy.service';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';

export interface SendMessageInput {
  recipientId: string;
  body: string;
  senderId: string;
}

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly messagingPolicy: MessagingPolicyService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(input: SendMessageInput): Promise<Message> {
    const recipient = await this.users.findById(input.recipientId);
    if (!recipient) {
      throw new NotFoundException(`No existe el usuario "${input.recipientId}"`);
    }

    const canMessage = await this.messagingPolicy.canMessage(input.senderId, input.recipientId);
    if (!canMessage) {
      throw new ForbiddenException('No podés escribirle a este usuario');
    }

    const message = new Message(
      randomUUID(),
      input.senderId,
      input.recipientId,
      input.body,
      new Date().toISOString(),
      null,
    );

    await this.messages.save(message);
    // Best-effort: si no hay nadie escuchando en /messages/stream para este
    // destinatario, publish() simplemente no tiene suscriptores — el mensaje
    // ya quedó guardado, el polling de fallback del frontend lo trae igual.
    await this.redis.publish(`messages:${input.recipientId}`, JSON.stringify(message));
    return message;
  }
}
