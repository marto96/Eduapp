import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateGradeUseCase } from '../../application/use-cases/create-grade.use-case';
import { ListGradesUseCase } from '../../application/use-cases/list-grades.use-case';
import { CreateGradeDto } from '../dtos/create-grade.dto';

@Controller('academic/grades')
export class GradesController {
  constructor(
    private readonly createGrade: CreateGradeUseCase,
    private readonly listGrades: ListGradesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Grade'))
  async create(@Body() dto: CreateGradeDto) {
    return this.createGrade.execute(dto);
  }

  @Get()
  async list() {
    return this.listGrades.execute();
  }
}
