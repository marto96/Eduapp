import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListAdmissionApplicationsUseCase } from '../../application/use-cases/list-admission-applications.use-case';
import { RecordAdmissionInterviewUseCase } from '../../application/use-cases/record-admission-interview.use-case';
import { AcceptAdmissionApplicationUseCase } from '../../application/use-cases/accept-admission-application.use-case';
import { RejectAdmissionApplicationUseCase } from '../../application/use-cases/reject-admission-application.use-case';
import { LinkAdmissionEnrollmentUseCase } from '../../application/use-cases/link-admission-enrollment.use-case';
import { RecordAdmissionInterviewDto } from '../dtos/record-admission-interview.dto';
import { RejectAdmissionApplicationDto } from '../dtos/reject-admission-application.dto';
import { LinkAdmissionEnrollmentDto } from '../dtos/link-admission-enrollment.dto';
import { AdmissionStatus } from '../../domain/entities/admission-application.entity';

@Controller('admissions/applications')
@CheckPolicies((ability) => ability.can('manage', 'Admission'))
export class AdmissionManagementController {
  constructor(
    private readonly listApplications: ListAdmissionApplicationsUseCase,
    private readonly recordInterview: RecordAdmissionInterviewUseCase,
    private readonly acceptApplication: AcceptAdmissionApplicationUseCase,
    private readonly rejectApplication: RejectAdmissionApplicationUseCase,
    private readonly linkEnrollment: LinkAdmissionEnrollmentUseCase,
  ) {}

  @Get()
  async list(
    @Query('status') status?: AdmissionStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.listApplications.execute(
      status,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
      search,
    );
  }

  @Patch(':id/interview')
  async interview(@Param('id') id: string, @Body() dto: RecordAdmissionInterviewDto) {
    return this.recordInterview.execute(id, {
      interviewDate: dto.interviewDate,
      interviewNotes: dto.interviewNotes ?? null,
    });
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string) {
    return this.acceptApplication.execute(id);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectAdmissionApplicationDto) {
    return this.rejectApplication.execute(id, dto.rejectionReason);
  }

  @Patch(':id/link-enrollment')
  async link(@Param('id') id: string, @Body() dto: LinkAdmissionEnrollmentDto) {
    return this.linkEnrollment.execute(id, dto.enrollmentId);
  }
}
