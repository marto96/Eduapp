import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateEvaluationUseCase } from '../../application/use-cases/create-evaluation.use-case';
import { ListEvaluationsUseCase } from '../../application/use-cases/list-evaluations.use-case';
import { CreateEvaluationDto } from '../dtos/create-evaluation.dto';
import { ListEvaluationsQueryDto } from '../dtos/list-evaluations-query.dto';

@Controller('grading/evaluations')
export class EvaluationsController {
  constructor(
    private readonly createEvaluation: CreateEvaluationUseCase,
    private readonly listEvaluations: ListEvaluationsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async create(@Body() dto: CreateEvaluationDto, @CurrentUser() user: JwtPayload) {
    return this.createEvaluation.execute(dto, user);
  }

  @Get()
  async list(@Query() query: ListEvaluationsQueryDto) {
    return this.listEvaluations.execute(query);
  }
}
