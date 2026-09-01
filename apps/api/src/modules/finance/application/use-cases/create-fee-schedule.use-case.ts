import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FeeScheduleRepositoryPort } from '../ports/fee-schedule.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AcademicYearRepositoryPort } from '../../../academic/application/ports/academic-year.repository.port';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';
import { ChargeConcept } from '../../domain/entities/charge.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface CreateFeeScheduleInput {
  gradeId: string;
  academicYearId: string;
  concept: ChargeConcept;
  amount: number;
}

@Injectable()
export class CreateFeeScheduleUseCase {
  constructor(
    @Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
    @Inject(AcademicYearRepositoryPort) private readonly academicYears: AcademicYearRepositoryPort,
  ) {}

  async execute(input: CreateFeeScheduleInput): Promise<FeeSchedule> {
    const grade = await this.grades.findById(input.gradeId);
    if (!grade) {
      throw new NotFoundException(`No existe el grado "${input.gradeId}"`);
    }
    const year = await this.academicYears.findById(input.academicYearId);
    if (!year) {
      throw new NotFoundException(`No existe el año lectivo "${input.academicYearId}"`);
    }

    const existing = await this.feeSchedules.findOne(input.gradeId, input.academicYearId, input.concept);
    if (existing) {
      throw new ConflictException('Ya existe un precio configurado para ese grado, año y concepto');
    }

    let feeSchedule: FeeSchedule;
    try {
      feeSchedule = new FeeSchedule(randomUUID(), input.gradeId, input.academicYearId, input.concept, input.amount);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    try {
      await this.feeSchedules.save(feeSchedule);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Ya existe un precio configurado para ese grado, año y concepto');
      }
      throw err;
    }
    return feeSchedule;
  }
}
