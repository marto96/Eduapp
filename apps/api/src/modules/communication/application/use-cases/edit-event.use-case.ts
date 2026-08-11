import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventRepositoryPort } from '../ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';

export interface EditEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  sectionId: string | null;
}

@Injectable()
export class EditEventUseCase {
  constructor(@Inject(EventRepositoryPort) private readonly events: EventRepositoryPort) {}

  async execute(id: string, input: EditEventInput): Promise<Event> {
    const event = await this.events.findById(id);
    if (!event) {
      throw new NotFoundException(`No existe el evento "${id}"`);
    }
    if (event.voidedAt) {
      throw new ConflictException('No se puede editar un evento anulado');
    }

    event.edit(input.title, input.description, input.startsAt, input.endsAt, input.sectionId);
    await this.events.save(event);
    return event;
  }
}
