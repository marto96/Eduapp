import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { OverdueBalanceCheckerPort } from '../ports/overdue-balance-checker.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';

export interface EnrollStudentInput {
  studentId: string;
  sectionId: string;
  academicYearId: string;
}

@Injectable()
export class EnrollStudentUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(OverdueBalanceCheckerPort) private readonly overdueBalanceChecker: OverdueBalanceCheckerPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
  ) {}

  async execute(input: EnrollStudentInput): Promise<Enrollment> {
    const student = await this.users.findById(input.studentId);
    if (!student) {
      throw new NotFoundException(`No existe el usuario "${input.studentId}"`);
    }
    if (!student.hasRole('estudiante')) {
      throw new BadRequestException('El usuario no tiene rol "estudiante"');
    }

    const existingActive = await this.enrollments.findActiveByStudentAndYear(
      input.studentId,
      input.academicYearId,
    );
    if (existingActive) {
      throw new ConflictException('El estudiante ya tiene una matrícula activa en ese año lectivo');
    }

    const targetSection = await this.sections.findById(input.sectionId);
    if (!targetSection) {
      throw new NotFoundException(`No existe la sección "${input.sectionId}"`);
    }
    const targetGrade = await this.grades.findById(targetSection.gradeId);
    if (!targetGrade) {
      throw new NotFoundException(`No existe el grado de la sección "${input.sectionId}"`);
    }

    // Cubre matrículas de todos los años/estados: la deuda de un año
    // anterior no desaparece porque esa matrícula ya no esté activa.
    const priorEnrollments = await this.enrollments.findAll({ studentId: input.studentId });

    if (priorEnrollments.length > 0) {
      const maxPriorGradeOrder = await this.resolveMaxGradeOrder(priorEnrollments);
      if (targetGrade.order < maxPriorGradeOrder) {
        throw new ConflictException(
          'No se puede matricular al estudiante en un grado anterior a uno que ya cursó',
        );
      }
    }

    const priorEnrollmentIds = priorEnrollments.map((e) => e.id);
    if (await this.overdueBalanceChecker.hasOverdueBalance(priorEnrollmentIds)) {
      throw new ConflictException(
        'El estudiante tiene cartera vencida y no puede matricularse hasta regularizar su situación',
      );
    }

    const enrollment = new Enrollment(
      randomUUID(),
      input.studentId,
      input.sectionId,
      input.academicYearId,
      'active',
    );

    await this.enrollments.save(enrollment);
    return enrollment;
  }

  /** Mayor orden de grado entre todas las matrículas previas del estudiante (cualquier año/estado). */
  private async resolveMaxGradeOrder(priorEnrollments: Enrollment[]): Promise<number> {
    const priorSectionIds = [...new Set(priorEnrollments.map((e) => e.sectionId))];
    const priorSections = await Promise.all(priorSectionIds.map((id) => this.sections.findById(id)));

    const priorGradeIds = [
      ...new Set(priorSections.flatMap((section) => (section ? [section.gradeId] : []))),
    ];
    const priorGrades = await Promise.all(priorGradeIds.map((id) => this.grades.findById(id)));

    return Math.max(0, ...priorGrades.flatMap((grade) => (grade ? [grade.order] : [])));
  }
}
