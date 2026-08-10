import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { EnrollStudentUseCase } from '../../application/use-cases/enroll-student.use-case';
import { ListEnrollmentsUseCase } from '../../application/use-cases/list-enrollments.use-case';
import { EnrollStudentDto } from '../dtos/enroll-student.dto';
import { ListEnrollmentsQueryDto } from '../dtos/list-enrollments-query.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollStudent: EnrollStudentUseCase,
    private readonly listEnrollments: ListEnrollmentsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Enrollment'))
  async create(@Body() dto: EnrollStudentDto) {
    return this.enrollStudent.execute(dto);
  }

  @Get()
  async list(@Query() query: ListEnrollmentsQueryDto) {
    return this.listEnrollments.execute(query);
  }
}
