import { existsSync } from 'node:fs';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { GetGradebookUseCase, GradebookResponse, GradebookSubjectRow } from '../../../grading/application/use-cases/get-gradebook.use-case';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import {
  ReportCardAreaGroup,
  ReportCardPdfGenerator,
  ReportCardPeriodColumn,
  ReportCardStudent,
  ReportCardSubjectRow,
} from '../../infrastructure/pdf/report-card-pdf-generator';
import { buildLogoDiskPath } from '../services/resolve-logo-path';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface GenerateReportCardPdfInput {
  sectionId: string;
  academicYearId: string;
  studentIds?: string[];
}

const SIN_AREA = 'Sin área';

/**
 * A diferencia de los documentos emitidos (registro histórico, PDF
 * persistido), el boletín se recalcula al vuelo con las notas actuales y
 * no se guarda en ningún lado — se genera y se devuelve el Buffer directo.
 *
 * Delega todo el cálculo de notas en `GetGradebookUseCase` (el mismo que
 * usan el gradebook del docente y Calificaciones del estudiante) en vez de
 * reimplementarlo — así la recuperación de materias, el acumulado y el
 * chequeo de acceso por matrícula nunca pueden desalinearse entre
 * pantallas. Efecto secundario intencional: un docente sin acceso a la
 * sección ahora recibe `ForbiddenException` acá también.
 */
@Injectable()
export class GenerateReportCardPdfUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly getGradebook: GetGradebookUseCase,
    private readonly pdfGenerator: ReportCardPdfGenerator,
    private readonly tenantRegistry: TenantRegistryService,
  ) {}

  async execute(input: GenerateReportCardPdfInput, currentUser: JwtPayload): Promise<Buffer> {
    const allEnrollments = await this.enrollments.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    const targetEnrollments = input.studentIds?.length
      ? allEnrollments.filter((e) => input.studentIds!.includes(e.studentId))
      : allEnrollments;

    if (targetEnrollments.length === 0) {
      throw new NotFoundException('No hay estudiantes matriculados en esa sección/año');
    }

    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);

    // El logo se guarda como URL pública (LocalDiskFileStorage) pero
    // `doc.image()` necesita una ruta de disco real — se resuelve acá y no
    // en el generador, para que este último siga siendo puro pdfkit sin
    // tocar el filesystem. Fallback silencioso: sin logo subido, o archivo
    // borrado a mano, el boletín igual se genera (solo texto).
    let institutionLogoPath: string | null = null;
    if (tenant?.logoUrl) {
      const candidate = buildLogoDiskPath(tenant.logoUrl, process.env.UPLOADS_DIR ?? 'uploads');
      if (existsSync(candidate)) institutionLogoPath = candidate;
    }

    const gradebooks = await Promise.all(
      targetEnrollments.map((enrollment) => this.getGradebook.execute(enrollment.id, currentUser)),
    );

    const students: ReportCardStudent[] = gradebooks.map((gradebook) => this.buildReportCardStudent(gradebook));
    const first = gradebooks[0];

    return this.pdfGenerator.generate({
      institutionName: tenant?.name ?? 'Skolaria',
      institutionColor: tenant?.primaryColor ?? null,
      institutionLogoPath,
      sectionName: first.sectionName,
      academicYearName: first.academicYearName,
      students,
    });
  }

  private buildReportCardStudent(gradebook: GradebookResponse): ReportCardStudent {
    const periods: ReportCardPeriodColumn[] = gradebook.periods.map((p) => ({
      periodId: p.id,
      periodName: p.name,
    }));

    const subjectsByArea = new Map<string, GradebookSubjectRow[]>();
    for (const subject of gradebook.subjects) {
      const areaName = subject.subjectArea.trim() ? subject.subjectArea : SIN_AREA;
      const list = subjectsByArea.get(areaName) ?? [];
      list.push(subject);
      subjectsByArea.set(areaName, list);
    }

    const areas: ReportCardAreaGroup[] = [...subjectsByArea.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([areaName, subjectRows]) => this.buildAreaGroup(areaName, subjectRows, periods));

    return { studentName: gradebook.studentName, periods, areas };
  }

  private buildAreaGroup(
    areaName: string,
    subjectRows: GradebookSubjectRow[],
    periods: ReportCardPeriodColumn[],
  ): ReportCardAreaGroup {
    const subjects: ReportCardSubjectRow[] = subjectRows.map((row) => {
      const allPeriodsNull = row.periods.every((cell) => cell.grade === null);
      return {
        subjectName: row.subjectName,
        gradeByPeriodId: Object.fromEntries(row.periods.map((cell) => [cell.periodId, cell.grade])),
        recoveredPeriodIds: new Set(row.periods.filter((cell) => cell.isRecovered).map((cell) => cell.periodId)),
        finalGrade: allPeriodsNull ? null : row.accumulatedGrade,
      };
    });

    const averageByPeriodId: Record<string, number | null> = {};
    for (const period of periods) {
      const grades = subjects
        .map((s) => s.gradeByPeriodId[period.periodId])
        .filter((g): g is number => g !== null && g !== undefined);
      averageByPeriodId[period.periodId] =
        grades.length === 0 ? null : grades.reduce((sum, g) => sum + g, 0) / grades.length;
    }

    const finals = subjects.map((s) => s.finalGrade).filter((g): g is number => g !== null);
    const finalAverage = finals.length === 0 ? null : finals.reduce((sum, g) => sum + g, 0) / finals.length;

    return { areaName, subjects, averageByPeriodId, finalAverage };
  }
}
