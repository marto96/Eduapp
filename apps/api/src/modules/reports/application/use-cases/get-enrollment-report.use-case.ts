import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';

export interface EnrollmentReportRow {
  sectionId: string;
  active: number;
  withdrawn: number;
  completed: number;
  total: number;
}

export interface GetEnrollmentReportInput {
  academicYearId?: string;
}

/**
 * Agrega en memoria sobre `EnrollmentRepositoryPort.findAll()` — mismo
 * patrón ya usado en `ListChargesUseCase` para `balance`/`status`, no hay
 * ningún método de conteo/suma en los repository ports del proyecto.
 */
@Injectable()
export class GetEnrollmentReportUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
  ) {}

  async execute(input: GetEnrollmentReportInput): Promise<EnrollmentReportRow[]> {
    const enrollments = await this.enrollments.findAll({ academicYearId: input.academicYearId });

    const bySection = new Map<string, EnrollmentReportRow>();
    for (const enrollment of enrollments) {
      const row = bySection.get(enrollment.sectionId) ?? {
        sectionId: enrollment.sectionId,
        active: 0,
        withdrawn: 0,
        completed: 0,
        total: 0,
      };
      row[enrollment.status] += 1;
      row.total += 1;
      bySection.set(enrollment.sectionId, row);
    }

    return Array.from(bySection.values());
  }
}
