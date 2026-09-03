import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreatePeriodUseCase } from '../../application/use-cases/create-period.use-case';
import { ListPeriodsUseCase } from '../../application/use-cases/list-periods.use-case';
import { EditPeriodUseCase } from '../../application/use-cases/edit-period.use-case';
import { CreatePeriodDto } from '../dtos/create-period.dto';
import { EditPeriodDto } from '../dtos/edit-period.dto';
import { ListPeriodsQueryDto } from '../dtos/list-periods-query.dto';

@Controller('academic/periods')
export class PeriodsController {
  constructor(
    private readonly createPeriod: CreatePeriodUseCase,
    private readonly listPeriods: ListPeriodsUseCase,
    private readonly editPeriod: EditPeriodUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async create(@Body() dto: CreatePeriodDto) {
    return this.createPeriod.execute(dto);
  }

  @Get()
  async list(@Query() query: ListPeriodsQueryDto) {
    return this.listPeriods.execute(query);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async edit(@Param('id') id: string, @Body() dto: EditPeriodDto) {
    return this.editPeriod.execute(id, dto);
  }
}
