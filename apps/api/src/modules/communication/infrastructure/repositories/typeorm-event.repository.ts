import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventRepositoryPort } from '../../application/ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';
import { EventOrmEntity } from '../entities/event.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEventRepository extends EventRepositoryPort {
  private readonly repo: Repository<EventOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EventOrmEntity);
  }

  async findAll(): Promise<Event[]> {
    const rows = await this.repo.find({ order: { startsAt: 'ASC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(event: Event): Promise<void> {
    await this.repo.save({
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: new Date(event.startsAt),
      endsAt: event.endsAt ? new Date(event.endsAt) : null,
      createdBy: event.createdBy,
    });
  }

  private toDomain(row: EventOrmEntity): Event {
    return new Event(
      row.id,
      row.title,
      row.description,
      row.startsAt.toISOString(),
      row.endsAt ? row.endsAt.toISOString() : null,
      row.createdBy,
    );
  }
}
