import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { EditEventUseCase } from '../../application/use-cases/edit-event.use-case';
import { VoidEventUseCase } from '../../application/use-cases/void-event.use-case';
import { CreateEventDto } from '../dtos/create-event.dto';
import { EditEventDto } from '../dtos/edit-event.dto';

@Controller('events')
export class EventsController {
  constructor(
    private readonly createEvent: CreateEventUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly editEvent: EditEventUseCase,
    private readonly voidEvent: VoidEventUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Event'))
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.createEvent.execute({ ...dto, createdBy: user.sub });
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.listEvents.execute(user);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Event'))
  async annul(@Param('id') id: string) {
    return this.voidEvent.execute(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Event'))
  async edit(@Param('id') id: string, @Body() dto: EditEventDto) {
    return this.editEvent.execute(id, {
      ...dto,
      endsAt: dto.endsAt ?? null,
      sectionId: dto.sectionId ?? null,
    });
  }
}
