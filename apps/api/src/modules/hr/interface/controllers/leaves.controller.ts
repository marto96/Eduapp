import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateLeaveUseCase } from '../../application/use-cases/create-leave.use-case';
import { ListLeavesUseCase } from '../../application/use-cases/list-leaves.use-case';
import { CancelLeaveUseCase } from '../../application/use-cases/cancel-leave.use-case';
import { CreateLeaveDto } from '../dtos/create-leave.dto';
import { ListLeavesQueryDto } from '../dtos/list-leaves-query.dto';

@Controller('hr/leaves')
export class LeavesController {
  constructor(
    private readonly createLeave: CreateLeaveUseCase,
    private readonly listLeaves: ListLeavesUseCase,
    private readonly cancelLeave: CancelLeaveUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Hr'))
  async create(@Body() dto: CreateLeaveDto) {
    return this.createLeave.execute(dto);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'Hr'))
  async list(@Query() query: ListLeavesQueryDto) {
    return this.listLeaves.execute(query);
  }

  @Patch(':id/cancel')
  @CheckPolicies((ability) => ability.can('update', 'Hr'))
  async cancel(@Param('id') id: string) {
    await this.cancelLeave.execute(id);
    return { cancelled: true };
  }
}
