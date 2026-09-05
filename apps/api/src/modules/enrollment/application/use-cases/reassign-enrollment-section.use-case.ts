import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { SectionRepositoryPort } from '../../../academic/application/ports/section.repository.port';

/**
 * Reubica una matrícula a otra sección del MISMO grado (ej. 6A -> 6B) — no
 * a otro grado, eso sería una promoción/cambio de grado, un flujo distinto
 * (retirar + volver a matricular).
 */
@Injectable()
export class ReassignEnrollmentSectionUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SectionRepositoryPort) private readonly sections: SectionRepositoryPort,
  ) {}

  async execute(id: string, newSectionId: string): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${id}"`);
    }

    if (enrollment.status !== 'active') {
      throw new BadRequestException('Solo se puede reubicar una matrícula activa');
    }

    const currentSection = await this.sections.findById(enrollment.sectionId);
    if (!currentSection) {
      throw new NotFoundException('No existe la sección actual de la matrícula');
    }

    const newSection = await this.sections.findById(newSectionId);
    if (!newSection) {
      throw new NotFoundException(`No existe la sección "${newSectionId}"`);
    }

    if (newSection.gradeId !== currentSection.gradeId) {
      throw new BadRequestException('La nueva sección debe ser del mismo grado');
    }

    enrollment.reassignSection(newSectionId);
    await this.enrollments.save(enrollment);
    return enrollment;
  }
}
