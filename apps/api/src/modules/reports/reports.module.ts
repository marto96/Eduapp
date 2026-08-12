import { Module } from '@nestjs/common';
import { ReportsController } from './interface/controllers/reports.controller';
import { GetEnrollmentReportUseCase } from './application/use-cases/get-enrollment-report.use-case';
import { GetAttendanceReportUseCase } from './application/use-cases/get-attendance-report.use-case';
import { GetFinanceReportUseCase } from './application/use-cases/get-finance-report.use-case';
import { GenerateReportCardPdfUseCase } from './application/use-cases/generate-report-card-pdf.use-case';
import { ReportCardPdfGenerator } from './infrastructure/pdf/report-card-pdf-generator';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { FinanceModule } from '../finance/finance.module';
import { GradingModule } from '../grading/grading.module';
import { AcademicModule } from '../academic/academic.module';
import { IdentityModule } from '../identity/identity.module';

/**
 * Sin tablas propias — agrega datos de otros módulos vía sus `findAll()`
 * ya existentes (mismo patrón que `ListChargesUseCase`), por eso no entra
 * en `TENANT_MODULES` (esa lista es solo para wiring de entidades/
 * migraciones).
 */
@Module({
  imports: [EnrollmentModule, AttendanceModule, FinanceModule, GradingModule, AcademicModule, IdentityModule],
  controllers: [ReportsController],
  providers: [
    GetEnrollmentReportUseCase,
    GetAttendanceReportUseCase,
    GetFinanceReportUseCase,
    GenerateReportCardPdfUseCase,
    ReportCardPdfGenerator,
  ],
})
export class ReportsModule {}
