import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge, ChargeConcept } from '../../domain/entities/charge.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';

export interface CreateChargeInput {
  enrollmentId: string;
  concept: ChargeConcept;
  description: string;
  amount: number;
  dueDate: string;
  discountAmount?: number;
}

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

    await this.charges.save(charge);
    return charge;
  }
}
