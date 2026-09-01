import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateFeeScheduleUseCase } from '../../application/use-cases/create-fee-schedule.use-case';
import { EditFeeScheduleUseCase } from '../../application/use-cases/edit-fee-schedule.use-case';
import { ListFeeSchedulesUseCase } from '../../application/use-cases/list-fee-schedules.use-case';
import { CreateFeeScheduleDto } from '../dtos/create-fee-schedule.dto';
import { EditFeeScheduleDto } from '../dtos/edit-fee-schedule.dto';

@Controller('finance/fee-schedules')
export class FeeSchedulesController {
  constructor(
    private readonly createFeeSchedule: CreateFeeScheduleUseCase,
    private readonly editFeeSchedule: EditFeeScheduleUseCase,
    private readonly listFeeSchedules: ListFeeSchedulesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Finance'))
  async create(@Body() dto: CreateFeeScheduleDto) {
    return this.createFeeSchedule.execute(dto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Finance'))
  async edit(@Param('id') id: string, @Body() dto: EditFeeScheduleDto) {
    return this.editFeeSchedule.execute(id, dto);
  }

  // Sin @CheckPolicies, igual que ChargesController.list(): 'read' en
  // 'Finance' ya lo tienen docente/estudiante/padre_tutor — la lista de
  // precios no es información sensible por sección, a diferencia de los
  // cargos individuales.
  @Get()
  async list() {
    return this.listFeeSchedules.execute();
  }
}
