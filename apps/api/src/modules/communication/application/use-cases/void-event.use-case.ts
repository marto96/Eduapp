import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventRepositoryPort } from '../ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class VoidEventUseCase {
  constructor(@Inject(EventRepositoryPort) private readonly events: EventRepositoryPort) {}

  async execute(id: string): Promise<Event> {
    const event = await this.events.findById(id);
    if (!event) {
      throw new NotFoundException(`No existe el evento "${id}"`);
    }
    if (event.voidedAt) {
      throw new ConflictException('El evento ya está anulado');
    }

    event.markVoided();
    await this.events.save(event);
    return event;
  }
}
