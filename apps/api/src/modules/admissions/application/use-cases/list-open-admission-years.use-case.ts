import { Inject, Injectable } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';

export interface OpenAdmissionYear {
  id: string;
  name: string;
}

@Injectable()
export class ListOpenAdmissionYearsUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(): Promise<OpenAdmissionYear[]> {
    const years = await this.years.findAll();
    return years
      .filter((year) => year.admissionsOpen)
      .map((year) => ({ id: year.id, name: year.name }));
  }
}
