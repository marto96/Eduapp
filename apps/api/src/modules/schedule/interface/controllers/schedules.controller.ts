import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateScheduleUseCase } from '../../application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from '../../application/use-cases/list-schedules.use-case';
import { SetScheduleVirtualUseCase } from '../../application/use-cases/set-schedule-virtual.use-case';
import { GetVirtualRoomUseCase } from '../../application/use-cases/get-virtual-room.use-case';
import { CancelClassSessionUseCase } from '../../application/use-cases/cancel-class-session.use-case';
import { UncancelClassSessionUseCase } from '../../application/use-cases/uncancel-class-session.use-case';
import { ListClassCancellationsUseCase } from '../../application/use-cases/list-class-cancellations.use-case';
import { CreateScheduleDto } from '../dtos/create-schedule.dto';
import { ListSchedulesQueryDto } from '../dtos/list-schedules-query.dto';
import { SetScheduleVirtualDto } from '../dtos/set-schedule-virtual.dto';
import { CancelClassSessionDto } from '../dtos/cancel-class-session.dto';
import { ListClassCancellationsQueryDto } from '../dtos/list-class-cancellations-query.dto';

@Controller('schedule')
export class SchedulesController {
  constructor(
    private readonly createSchedule: CreateScheduleUseCase,
    private readonly listSchedules: ListSchedulesUseCase,
    private readonly setScheduleVirtual: SetScheduleVirtualUseCase,
    private readonly getVirtualRoom: GetVirtualRoomUseCase,
    private readonly cancelClassSession: CancelClassSessionUseCase,
    private readonly uncancelClassSession: UncancelClassSessionUseCase,
    private readonly listClassCancellations: ListClassCancellationsUseCase,
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

  @Get('cancellations')
  @CheckPolicies((ability) => ability.can('read', 'VirtualClass'))
  async listCancellations(@Query() query: ListClassCancellationsQueryDto) {
    return this.listClassCancellations.execute(query);
  }

  @Delete('cancellations/:id')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async uncancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.uncancelClassSession.execute(id, user);
    return { ok: true };
  }

  @Patch(':id/virtual')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async setVirtual(@Param('id') id: string, @Body() dto: SetScheduleVirtualDto, @CurrentUser() user: JwtPayload) {
    return this.setScheduleVirtual.execute(id, dto.isVirtual, user);
  }

  @Get(':id/virtual-room')
  @CheckPolicies((ability) => ability.can('read', 'VirtualClass'))
  async virtualRoom(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.getVirtualRoom.execute(id, user);
  }

  @Post(':id/cancellations')
  @CheckPolicies((ability) => ability.can('manage', 'VirtualClass'))
  async cancel(@Param('id') id: string, @Body() dto: CancelClassSessionDto, @CurrentUser() user: JwtPayload) {
    return this.cancelClassSession.execute({ scheduleId: id, date: dto.date, reason: dto.reason }, user);
  }
}
