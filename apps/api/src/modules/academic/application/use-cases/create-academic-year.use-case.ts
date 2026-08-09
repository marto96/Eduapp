import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';

export interface CreateAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class CreateAcademicYearUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(input: CreateAcademicYearInput): Promise<AcademicYear> {
    let year: AcademicYear;
    try {
      year = new AcademicYear(
        randomUUID(),
        input.name,
        new Date(input.startDate),
        new Date(input.endDate),
        'active',
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.years.save(year);
    return year;
  }
}
