import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EventRepositoryPort } from '../ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

export interface CreateEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string | null;
  createdBy: string;
}

@Injectable()
export class CreateEventUseCase {
  constructor(@Inject(EventRepositoryPort) private readonly events: EventRepositoryPort) {}

  async execute(input: CreateEventInput): Promise<Event> {
    const event = new Event(
      randomUUID(),
      input.title,
      input.description,
      input.startsAt,
      input.endsAt ?? null,
      input.createdBy,
    );

    await this.events.save(event);
    return event;
  }
}
