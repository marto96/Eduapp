import { Inject, Injectable } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListMessagesUseCase {
  constructor(@Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<Message[]> {
    return this.messages.findAllForUser(currentUser.sub);
  }
}
