import { Event } from '../../domain/entities/event.entity';

export abstract class EventRepositoryPort {
  abstract findAll(): Promise<Event[]>;
  abstract save(event: Event): Promise<void>;
}
