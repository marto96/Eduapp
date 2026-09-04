import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearRepositoryPort } from '../ports/academic-year.repository.port';
import { todayLocalDate } from './academic-year-dates.util';

@Injectable()
export class DeleteAcademicYearUseCase {
  constructor(
    @Inject(AcademicYearRepositoryPort) private readonly years: AcademicYearRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const year = await this.years.findById(id);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${id}"`);
    }

    if (year.startDate.toISOString().slice(0, 10) <= todayLocalDate()) {
      throw new BadRequestException(
        'No se puede eliminar un año lectivo que ya empezó o está en curso',
      );
    }

    await this.years.deleteById(id);
  }
}
