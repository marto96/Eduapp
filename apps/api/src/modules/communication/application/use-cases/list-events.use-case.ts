import { Inject, Injectable } from '@nestjs/common';
import { EventRepositoryPort } from '../ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class ListEventsUseCase {
  constructor(@Inject(EventRepositoryPort) private readonly events: EventRepositoryPort) {}

  async execute(): Promise<Event[]> {
    return this.events.findAll();
  }
}
