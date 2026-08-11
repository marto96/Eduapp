import { Controller, Get, Param, Patch, Post, Body, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { EnrollStudentUseCase } from '../../application/use-cases/enroll-student.use-case';
import { ListEnrollmentsUseCase } from '../../application/use-cases/list-enrollments.use-case';
import { WithdrawEnrollmentUseCase } from '../../application/use-cases/withdraw-enrollment.use-case';
import { CompleteEnrollmentUseCase } from '../../application/use-cases/complete-enrollment.use-case';
import { EnrollStudentDto } from '../dtos/enroll-student.dto';
import { ListEnrollmentsQueryDto } from '../dtos/list-enrollments-query.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollStudent: EnrollStudentUseCase,
    private readonly listEnrollments: ListEnrollmentsUseCase,
    private readonly withdrawEnrollment: WithdrawEnrollmentUseCase,
    private readonly completeEnrollment: CompleteEnrollmentUseCase,
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

  @Patch(':id/withdraw')
  @CheckPolicies((ability) => ability.can('update', 'Enrollment'))
  async withdraw(@Param('id') id: string) {
    return this.withdrawEnrollment.execute(id);
  }

  @Patch(':id/complete')
  @CheckPolicies((ability) => ability.can('update', 'Enrollment'))
  async complete(@Param('id') id: string) {
    return this.completeEnrollment.execute(id);
  }
}
