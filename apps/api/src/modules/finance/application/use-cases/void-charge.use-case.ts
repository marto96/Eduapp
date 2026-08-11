import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { Charge } from '../../domain/entities/charge.entity';

@Injectable()
export class VoidChargeUseCase {
  constructor(@Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort) {}

  async execute(id: string): Promise<Charge> {
    const charge = await this.charges.findById(id);
    if (!charge) {
      throw new NotFoundException(`No existe el cargo "${id}"`);
    }
    if (charge.voidedAt) {
      throw new ConflictException('El cargo ya está anulado');
    }

    charge.markVoided();
    await this.charges.save(charge);
    return charge;
  }
}
