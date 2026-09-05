import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';

@Injectable()
export class SetAdmissionsOpenUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(id: string, open: boolean): Promise<AcademicYear> {
    const year = await this.years.findById(id);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${id}"`);
    }

    if (open) {
      year.openAdmissions();
    } else {
      year.closeAdmissions();
    }

    await this.years.save(year);
    return year;
  }
}
