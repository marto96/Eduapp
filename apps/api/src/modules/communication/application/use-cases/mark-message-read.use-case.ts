import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkMessageReadUseCase {
  constructor(@Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<Message> {
    const message = await this.messages.findById(id);
    if (!message) {
      throw new NotFoundException(`No existe el mensaje "${id}"`);
    }
    if (message.recipientId !== currentUser.sub) {
      throw new ForbiddenException('Solo el destinatario puede marcar un mensaje como leído');
    }

    message.markRead();
    await this.messages.save(message);
    return message;
  }
}
