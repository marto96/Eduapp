import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EvaluationRepositoryPort } from '../../../grading/application/ports/evaluation.repository.port';
import { GradeScoreRepositoryPort } from '../../../grading/application/ports/grade-score.repository.port';
import { SubjectRepositoryPort } from '../../../academic/application/ports/subject.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';
import { ReportCardPdfGenerator, ReportCardStudent } from '../../infrastructure/pdf/report-card-pdf-generator';

export interface GenerateReportCardPdfInput {
  sectionId: string;
  academicYearId: string;
  studentIds?: string[];
}

/**
 * A diferencia de los documentos emitidos (registro histórico, PDF
 * persistido), el boletín se recalcula al vuelo con las notas actuales y
 * no se guarda en ningún lado — se genera y se devuelve el Buffer directo.
 */
@Injectable()
export class GenerateReportCardPdfUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(EvaluationRepositoryPort) private readonly evaluations: EvaluationRepositoryPort,
    @Inject(GradeScoreRepositoryPort) private readonly scores: GradeScoreRepositoryPort,
    @Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly pdfGenerator: ReportCardPdfGenerator,
    private readonly tenantRegistry: TenantRegistryService,
  ) {}

  async execute(input: GenerateReportCardPdfInput): Promise<Buffer> {
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

    const sectionEvaluations = await this.evaluations.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    const evaluationById = new Map(sectionEvaluations.map((e) => [e.id, e]));

    const allSubjects = await this.subjects.findAll();
    const subjectNameById = new Map(allSubjects.map((s) => [s.id, s.name]));

    const allSections = await this.sections.findAll();
    const section = allSections.find((s) => s.id === input.sectionId);
    const academicYear = await this.academicYears.findById(input.academicYearId);

    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);

    const students: ReportCardStudent[] = [];
    for (const enrollment of targetEnrollments) {
      const student = await this.users.findById(enrollment.studentId);
      const enrollmentScores = await this.scores.findAll({ enrollmentId: enrollment.id });

      const rows = enrollmentScores
        .map((score) => {
          const evaluation = evaluationById.get(score.evaluationId);
          if (!evaluation) return null;
          return {
            subjectName: subjectNameById.get(evaluation.subjectId) ?? evaluation.subjectId,
            period: evaluation.period,
            type: evaluation.type,
            score: score.score,
            maxScore: evaluation.maxScore,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      students.push({ studentName: student?.fullName ?? enrollment.studentId, rows });
    }

    return this.pdfGenerator.generate({
      institutionName: tenant?.name ?? 'EduApp',
      sectionName: section?.name ?? input.sectionId,
      academicYearName: academicYear?.name ?? input.academicYearId,
      students,
    });
  }
}
