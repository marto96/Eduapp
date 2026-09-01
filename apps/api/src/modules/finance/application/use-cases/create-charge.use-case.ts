import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge, ChargeConcept } from '../../domain/entities/charge.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface CreateChargeInput {
  enrollmentId: string;
  concept: ChargeConcept;
  description: string;
  amount: number;
  dueDate: string;
  discountAmount?: number;
}

const DUPLICATE_MESSAGES: Record<'matricula' | 'pension', string> = {
  matricula: 'Ya existe una matrícula cargada para esta inscripción',
  pension: 'Ya existe un cargo de pensión para ese mes en esta inscripción',
};

@Injectable()
export class CreateChargeUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
  ) {}

  async execute(input: CreateChargeInput): Promise<Charge> {
    const enrollment = await this.enrollments.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${input.enrollmentId}"`);
    }

    if (input.concept === 'matricula') {
      const existing = await this.charges.findAll({ enrollmentId: input.enrollmentId, concept: 'matricula' });
      if (existing.some((c) => !c.voidedAt)) {
        throw new ConflictException(DUPLICATE_MESSAGES.matricula);
      }
    }
    if (input.concept === 'pension') {
      const dueMonth = input.dueDate.slice(0, 7);
      const existing = await this.charges.findAll({ enrollmentId: input.enrollmentId, concept: 'pension' });
      if (existing.some((c) => !c.voidedAt && c.dueDate.slice(0, 7) === dueMonth)) {
        throw new ConflictException(DUPLICATE_MESSAGES.pension);
      }
    }

    let charge: Charge;
    try {
      charge = new Charge(
        randomUUID(),
        input.enrollmentId,
        input.concept,
        input.description,
        input.amount,
        input.dueDate,
        input.discountAmount ?? 0,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    try {
      await this.charges.save(charge);
    } catch (err) {
      if (isUniqueViolation(err) && (input.concept === 'matricula' || input.concept === 'pension')) {
        throw new ConflictException(DUPLICATE_MESSAGES[input.concept]);
      }
      throw err;
    }
    return charge;
  }
}
