import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MessageRepositoryPort } from '../../application/ports/message.repository.port';
import { Message } from '../../domain/entities/message.entity';
import { MessageOrmEntity } from '../entities/message.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmMessageRepository extends MessageRepositoryPort {
  private readonly repo: Repository<MessageOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(MessageOrmEntity);
  }

  async findAllForUser(userId: string): Promise<Message[]> {
    const rows = await this.repo.find({
      where: [{ senderId: userId }, { recipientId: userId }],
      order: { sentAt: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Message | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(message: Message): Promise<void> {
    await this.repo.save({
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      body: message.body,
      sentAt: new Date(message.sentAt),
      readAt: message.readAt ? new Date(message.readAt) : null,
    });
  }

  private toDomain(row: MessageOrmEntity): Message {
    return new Message(
      row.id,
      row.senderId,
      row.recipientId,
      row.body,
      row.sentAt.toISOString(),
      row.readAt ? row.readAt.toISOString() : null,
    );
  }
}
