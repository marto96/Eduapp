import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge } from '../../domain/entities/charge.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface EditChargeInput {
  amount: number;
  description: string;
  dueDate: string;
  discountAmount?: number;
}

const PENSION_DUPLICATE_MESSAGE = 'Ya existe otro cargo de pensión para ese mes en esta inscripción';

@Injectable()
export class EditChargeUseCase {
  constructor(@Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort) {}

  async execute(id: string, input: EditChargeInput): Promise<Charge> {
    const charge = await this.charges.findById(id);
    if (!charge) {
      throw new NotFoundException(`No existe el cargo "${id}"`);
    }
    if (charge.voidedAt) {
      throw new ConflictException('No se puede editar un cargo anulado');
    }

    if (charge.concept === 'pension') {
      const dueMonth = input.dueDate.slice(0, 7);
      const siblings = await this.charges.findAll({ enrollmentId: charge.enrollmentId, concept: 'pension' });
      if (siblings.some((c) => c.id !== id && !c.voidedAt && c.dueDate.slice(0, 7) === dueMonth)) {
        throw new ConflictException(PENSION_DUPLICATE_MESSAGE);
      }
    }

    charge.edit(input.amount, input.description, input.dueDate, input.discountAmount ?? 0);

    try {
      await this.charges.save(charge);
    } catch (err) {
      if (isUniqueViolation(err) && charge.concept === 'pension') {
        throw new ConflictException(PENSION_DUPLICATE_MESSAGE);
      }
      throw err;
    }
    return charge;
  }
}
