import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class EditMessageUseCase {
  constructor(@Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort) {}

  async execute(id: string, body: string, currentUser: JwtPayload): Promise<Message> {
    const message = await this.messages.findById(id);
    if (!message) {
      throw new NotFoundException(`No existe el mensaje "${id}"`);
    }
    if (message.senderId !== currentUser.sub) {
      throw new ForbiddenException('Solo el remitente puede editar un mensaje');
    }

    message.edit(body);
    await this.messages.save(message);
    return message;
  }
}
