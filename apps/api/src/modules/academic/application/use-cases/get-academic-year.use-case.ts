import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';

@Injectable()
export class GetAcademicYearUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(id: string): Promise<AcademicYear> {
    const year = await this.years.findById(id);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${id}"`);
    }
    return year;
  }
}
