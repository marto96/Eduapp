import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateScheduleUseCase } from '../../application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from '../../application/use-cases/list-schedules.use-case';
import { CreateScheduleDto } from '../dtos/create-schedule.dto';
import { ListSchedulesQueryDto } from '../dtos/list-schedules-query.dto';

@Controller('schedule')
export class SchedulesController {
  constructor(
    private readonly createSchedule: CreateScheduleUseCase,
    private readonly listSchedules: ListSchedulesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Schedule'))
  async create(@Body() dto: CreateScheduleDto) {
    return this.createSchedule.execute(dto);
  }

  @Get()
  async list(@Query() query: ListSchedulesQueryDto) {
    return this.listSchedules.execute(query);
  }
}
