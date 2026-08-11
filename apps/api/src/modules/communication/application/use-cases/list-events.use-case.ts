import { Inject, Injectable } from '@nestjs/common';
import { EventRepositoryPort } from '../ports/event.repository.port';
import { Event } from '../../domain/entities/event.entity';
import { AudienceAccessService } from '../services/audience-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(EventRepositoryPort) private readonly events: EventRepositoryPort,
    private readonly audienceAccess: AudienceAccessService,
  ) {}

  async execute(currentUser: JwtPayload): Promise<Event[]> {
    const all = await this.events.findAll();
    const visibleSectionIds = await this.audienceAccess.getVisibleSectionIds(currentUser);
    if (visibleSectionIds === null) return all;
    return all.filter((e) => e.sectionId === null || visibleSectionIds.has(e.sectionId));
  }
}
