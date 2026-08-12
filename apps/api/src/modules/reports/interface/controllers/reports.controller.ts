import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { GetEnrollmentReportUseCase } from '../../application/use-cases/get-enrollment-report.use-case';
import { GetAttendanceReportUseCase } from '../../application/use-cases/get-attendance-report.use-case';
import { GetFinanceReportUseCase } from '../../application/use-cases/get-finance-report.use-case';
import { GenerateReportCardPdfUseCase } from '../../application/use-cases/generate-report-card-pdf.use-case';
import { EnrollmentReportQueryDto } from '../dtos/enrollment-report-query.dto';
import { AttendanceReportQueryDto } from '../dtos/attendance-report-query.dto';
import { FinanceReportQueryDto } from '../dtos/finance-report-query.dto';
import { ReportCardQueryDto } from '../dtos/report-card-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly getEnrollmentReport: GetEnrollmentReportUseCase,
    private readonly getAttendanceReport: GetAttendanceReportUseCase,
    private readonly getFinanceReport: GetFinanceReportUseCase,
    private readonly generateReportCardPdf: GenerateReportCardPdfUseCase,
  ) {}

  @Get('enrollment')
  @CheckPolicies((ability) => ability.can('read', 'Report'))
  async enrollment(@Query() query: EnrollmentReportQueryDto) {
    return this.getEnrollmentReport.execute(query);
  }

  @Get('attendance')
  @CheckPolicies((ability) => ability.can('read', 'Report'))
  async attendance(@Query() query: AttendanceReportQueryDto) {
    return this.getAttendanceReport.execute(query);
  }

  @Get('finance')
  @CheckPolicies((ability) => ability.can('read', 'Report'))
  async finance(@Query() query: FinanceReportQueryDto) {
    return this.getFinanceReport.execute(query);
  }

  // Chequea Grading, no Report: un docente genera boletines de su propia
  // sección como tarea normal — mismo criterio que ya tiene para asistencia
  // y calificaciones, no el de reportes institucionales.
  @Get('grading/report-card.pdf')
  @CheckPolicies((ability) => ability.can('manage', 'Grading'))
  async reportCard(@Query() query: ReportCardQueryDto, @Res() res: Response) {
    const buffer = await this.generateReportCardPdf.execute({
      sectionId: query.sectionId,
      academicYearId: query.academicYearId,
      studentIds: query.studentId,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="boletin.pdf"');
    res.send(buffer);
  }
}
