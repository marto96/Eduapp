import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { CreateEventDto } from '../dtos/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(
    private readonly createEvent: CreateEventUseCase,
    private readonly listEvents: ListEventsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Event'))
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.createEvent.execute({ ...dto, createdBy: user.sub });
  }

  @Get()
  async list() {
    return this.listEvents.execute();
  }
}
