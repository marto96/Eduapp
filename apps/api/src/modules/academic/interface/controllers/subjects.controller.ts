import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateSubjectUseCase } from '../../application/use-cases/create-subject.use-case';
import { ListSubjectsUseCase } from '../../application/use-cases/list-subjects.use-case';
import { CreateSubjectDto } from '../dtos/create-subject.dto';

@Controller('academic/subjects')
export class SubjectsController {
  constructor(
    private readonly createSubject: CreateSubjectUseCase,
    private readonly listSubjects: ListSubjectsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Subject'))
  async create(@Body() dto: CreateSubjectDto) {
    return this.createSubject.execute(dto);
  }

  @Get()
  async list() {
    return this.listSubjects.execute();
  }
}
