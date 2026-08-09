import { Inject, Injectable } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';

@Injectable()
export class ListAcademicYearsUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(): Promise<AcademicYear[]> {
    return this.years.findAll();
  }
}
