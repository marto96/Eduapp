import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateClassroomUseCase } from '../../application/use-cases/create-classroom.use-case';
import { ListClassroomsUseCase } from '../../application/use-cases/list-classrooms.use-case';
import { CreateClassroomDto } from '../dtos/create-classroom.dto';

@Controller('academic/classrooms')
export class ClassroomsController {
  constructor(
    private readonly createClassroom: CreateClassroomUseCase,
    private readonly listClassrooms: ListClassroomsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Classroom'))
  async create(@Body() dto: CreateClassroomDto) {
    return this.createClassroom.execute(dto);
  }

  @Get()
  async list() {
    return this.listClassrooms.execute();
  }
}
