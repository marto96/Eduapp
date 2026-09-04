import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';
import { datesOverlap, todayLocalDate } from './academic-year-dates.util';

export interface EditAcademicYearInput {
  name: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class EditAcademicYearUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(id: string, input: EditAcademicYearInput): Promise<AcademicYear> {
    const year = await this.years.findById(id);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${id}"`);
    }

    if (year.startDate.toISOString().slice(0, 10) <= todayLocalDate()) {
      throw new BadRequestException(
        'No se puede editar un año lectivo que ya empezó o está en curso',
      );
    }

    const siblings = (await this.years.findAll()).filter((y) => y.id !== id);
    if (siblings.some((y) => y.name === input.name)) {
      throw new BadRequestException(`Ya existe un año lectivo llamado "${input.name}"`);
    }

    const newStartDate = new Date(input.startDate);
    const newEndDate = new Date(input.endDate);

    if (siblings.some((y) => datesOverlap(newStartDate, newEndDate, y.startDate, y.endDate))) {
      throw new BadRequestException('El rango de fechas se superpone con otro año lectivo existente');
    }

    try {
      year.edit(input.name, newStartDate, newEndDate);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.years.save(year);
    return year;
  }
}
