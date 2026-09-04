import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';
import { datesOverlap } from './academic-year-dates.util';

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
    const existing = await this.years.findAll();

    if (existing.some((y) => y.name === input.name)) {
      throw new BadRequestException(`Ya existe un año lectivo llamado "${input.name}"`);
    }

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

    if (existing.some((y) => datesOverlap(year.startDate, year.endDate, y.startDate, y.endDate))) {
      throw new BadRequestException('El rango de fechas se superpone con otro año lectivo existente');
    }

    await this.years.save(year);
    return year;
  }
}
