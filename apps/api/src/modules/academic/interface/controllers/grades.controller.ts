import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateGradeUseCase } from '../../application/use-cases/create-grade.use-case';
import { EditGradeUseCase } from '../../application/use-cases/edit-grade.use-case';
import { ListGradesUseCase } from '../../application/use-cases/list-grades.use-case';
import { CreateGradeDto } from '../dtos/create-grade.dto';
import { EditGradeDto } from '../dtos/edit-grade.dto';

@Controller('academic/grades')
export class GradesController {
  constructor(
    private readonly createGrade: CreateGradeUseCase,
    private readonly editGrade: EditGradeUseCase,
    private readonly listGrades: ListGradesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Grade'))
  async create(@Body() dto: CreateGradeDto) {
    return this.createGrade.execute(dto);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Grade'))
  async edit(@Param('id') id: string, @Body() dto: EditGradeDto) {
    return this.editGrade.execute(id, dto);
  }

  @Get()
  async list() {
    return this.listGrades.execute();
  }
}
