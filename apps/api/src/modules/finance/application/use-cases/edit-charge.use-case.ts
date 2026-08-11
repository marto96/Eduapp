import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge } from '../../domain/entities/charge.entity';

export interface EditChargeInput {
  amount: number;
  description: string;
  dueDate: string;
  discountAmount?: number;
}

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

    charge.edit(input.amount, input.description, input.dueDate, input.discountAmount ?? 0);
    await this.charges.save(charge);
    return charge;
  }
}
