import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { MessagingPolicyService } from '../services/messaging-policy.service';

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
    return message;
  }
}
