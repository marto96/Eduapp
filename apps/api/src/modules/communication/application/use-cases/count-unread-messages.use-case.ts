import { Inject, Injectable } from '@nestjs/common';
import { MessageRepositoryPort } from '../ports/message.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class CountUnreadMessagesUseCase {
  constructor(@Inject(MessageRepositoryPort) private readonly messages: MessageRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<number> {
    const all = await this.messages.findAllForUser(currentUser.sub);
    return all.filter((m) => m.recipientId === currentUser.sub && !m.readAt).length;
  }
}
