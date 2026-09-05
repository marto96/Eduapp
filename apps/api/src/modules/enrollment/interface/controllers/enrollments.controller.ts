import { Controller, Get, Param, Patch, Post, Body, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { EnrollStudentUseCase } from '../../application/use-cases/enroll-student.use-case';
import { ListEnrollmentsUseCase } from '../../application/use-cases/list-enrollments.use-case';
import { WithdrawEnrollmentUseCase } from '../../application/use-cases/withdraw-enrollment.use-case';
import { CompleteEnrollmentUseCase } from '../../application/use-cases/complete-enrollment.use-case';
import { ReassignEnrollmentSectionUseCase } from '../../application/use-cases/reassign-enrollment-section.use-case';
import { EnrollStudentDto } from '../dtos/enroll-student.dto';
import { ListEnrollmentsQueryDto } from '../dtos/list-enrollments-query.dto';
import { ReassignEnrollmentSectionDto } from '../dtos/reassign-enrollment-section.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollStudent: EnrollStudentUseCase,
    private readonly listEnrollments: ListEnrollmentsUseCase,
    private readonly withdrawEnrollment: WithdrawEnrollmentUseCase,
    private readonly completeEnrollment: CompleteEnrollmentUseCase,
    private readonly reassignEnrollmentSection: ReassignEnrollmentSectionUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Enrollment'))
  async create(@Body() dto: EnrollStudentDto) {
    return this.enrollStudent.execute(dto);
  }

  @Get()
  async list(@Query() query: ListEnrollmentsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listEnrollments.execute(query, user);
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

  @Patch(':id/reassign-section')
  @CheckPolicies((ability) => ability.can('update', 'Enrollment'))
  async reassignSection(@Param('id') id: string, @Body() dto: ReassignEnrollmentSectionDto) {
    return this.reassignEnrollmentSection.execute(id, dto.sectionId);
  }
}
