import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateLeaveUseCase } from '../../application/use-cases/create-leave.use-case';
import { ListLeavesUseCase } from '../../application/use-cases/list-leaves.use-case';
import { CreateLeaveDto } from '../dtos/create-leave.dto';
import { ListLeavesQueryDto } from '../dtos/list-leaves-query.dto';

@Controller('hr/leaves')
export class LeavesController {
  constructor(
    private readonly createLeave: CreateLeaveUseCase,
    private readonly listLeaves: ListLeavesUseCase,
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
}
