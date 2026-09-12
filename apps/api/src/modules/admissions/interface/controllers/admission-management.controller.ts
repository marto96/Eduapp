import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListAdmissionApplicationsUseCase } from '../../application/use-cases/list-admission-applications.use-case';
import { RecordAdmissionInterviewUseCase } from '../../application/use-cases/record-admission-interview.use-case';
import { AcceptAdmissionApplicationUseCase } from '../../application/use-cases/accept-admission-application.use-case';
import { RejectAdmissionApplicationUseCase } from '../../application/use-cases/reject-admission-application.use-case';
import { LinkAdmissionEnrollmentUseCase } from '../../application/use-cases/link-admission-enrollment.use-case';
import { ListGradeAdmissionAvailabilityUseCase } from '../../application/use-cases/list-grade-admission-availability.use-case';
import { SetAdmissionGradeClosedUseCase } from '../../application/use-cases/set-admission-grade-closed.use-case';
import { GetAdmissionDocumentsForReviewUseCase } from '../../application/use-cases/get-admission-documents-for-review.use-case';
import { DownloadAdmissionDocumentUseCase } from '../../application/use-cases/download-admission-document.use-case';
import { RecordAdmissionInterviewDto } from '../dtos/record-admission-interview.dto';
import { RejectAdmissionApplicationDto } from '../dtos/reject-admission-application.dto';
import { LinkAdmissionEnrollmentDto } from '../dtos/link-admission-enrollment.dto';
import { SetAdmissionGradeClosedDto } from '../dtos/set-admission-grade-closed.dto';
import { KNOWN_ADMISSION_DOCUMENT_TYPES } from '../dtos/upload-admission-document.dto';
import { AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { AdmissionDocumentType } from '../../domain/entities/admission-document.entity';

@Controller('admissions/applications')
@CheckPolicies((ability) => ability.can('manage', 'Admission'))
export class AdmissionManagementController {
  constructor(
    private readonly listApplications: ListAdmissionApplicationsUseCase,
    private readonly recordInterview: RecordAdmissionInterviewUseCase,
    private readonly acceptApplication: AcceptAdmissionApplicationUseCase,
    private readonly rejectApplication: RejectAdmissionApplicationUseCase,
    private readonly linkEnrollment: LinkAdmissionEnrollmentUseCase,
    private readonly listGradeAvailability: ListGradeAdmissionAvailabilityUseCase,
    private readonly setGradeClosed: SetAdmissionGradeClosedUseCase,
    private readonly getDocumentsForReview: GetAdmissionDocumentsForReviewUseCase,
    private readonly downloadDocument: DownloadAdmissionDocumentUseCase,
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

  @Get('grade-availability')
  async gradeAvailability(@Query('academicYearId') academicYearId: string) {
    return this.listGradeAvailability.execute(academicYearId);
  }

  @Patch('grade-availability/:gradeId')
  async setGradeAvailability(@Param('gradeId') gradeId: string, @Body() dto: SetAdmissionGradeClosedDto) {
    await this.setGradeClosed.execute(gradeId, dto.academicYearId, dto.closed);
    return { gradeId, academicYearId: dto.academicYearId, closed: dto.closed };
  }

  @Get(':id/documents')
  async documents(@Param('id') id: string) {
    return this.getDocumentsForReview.execute(id);
  }

  @Get(':id/documents/:type')
  async downloadDocumentEndpoint(
    @Param('id') id: string,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    if (!KNOWN_ADMISSION_DOCUMENT_TYPES.includes(type as AdmissionDocumentType)) {
      throw new BadRequestException('Tipo de documento desconocido');
    }
    const { buffer, filename } = await this.downloadDocument.execute(id, type as AdmissionDocumentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
