import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { RecordScoresUseCase } from '../../application/use-cases/record-scores.use-case';
import { ListScoresUseCase } from '../../application/use-cases/list-scores.use-case';
import { RecordScoresDto } from '../dtos/record-scores.dto';
import { ListScoresQueryDto } from '../dtos/list-scores-query.dto';

@Controller('grading/scores')
export class ScoresController {
  constructor(
    private readonly recordScores: RecordScoresUseCase,
    private readonly listScores: ListScoresUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async create(@Body() dto: RecordScoresDto) {
    return this.recordScores.execute(dto);
  }

  @Get()
  async list(@Query() query: ListScoresQueryDto) {
    return this.listScores.execute(query);
  }
}
