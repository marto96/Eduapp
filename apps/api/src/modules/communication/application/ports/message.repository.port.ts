import { Message } from '../../domain/entities/message.entity';

export abstract class MessageRepositoryPort {
  abstract findAllForUser(userId: string): Promise<Message[]>;
  abstract findById(id: string): Promise<Message | null>;
  abstract save(message: Message): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
