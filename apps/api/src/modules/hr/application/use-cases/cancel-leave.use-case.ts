import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRepositoryPort } from '../ports/leave.repository.port';

@Injectable()
export class CancelLeaveUseCase {
  constructor(@Inject(LeaveRepositoryPort) private readonly leaves: LeaveRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const leave = await this.leaves.findById(id);
    if (!leave) {
      throw new NotFoundException(`No existe la licencia "${id}"`);
    }

    await this.leaves.delete(id);
  }
}
