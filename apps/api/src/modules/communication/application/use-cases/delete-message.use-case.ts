import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class DeleteMessageUseCase {
  constructor(@Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<void> {
    const message = await this.messages.findById(id);
    if (!message) {
      throw new NotFoundException(`No existe el mensaje "${id}"`);
    }
    if (message.senderId !== currentUser.sub) {
      throw new ForbiddenException('Solo el remitente puede eliminar un mensaje');
    }

    await this.messages.delete(id);
  }
}
