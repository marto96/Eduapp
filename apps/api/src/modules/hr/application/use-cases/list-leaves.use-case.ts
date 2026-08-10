import { Inject, Injectable } from '@nestjs/common';
import { LeaveFilter, LeaveRepositoryPort } from '../ports/leave.repository.port';
import { Leave } from '../../domain/entities/leave.entity';

@Injectable()
export class ListLeavesUseCase {
  constructor(@Inject(LeaveRepositoryPort) private readonly leaves: LeaveRepositoryPort) {}

  async execute(filter?: LeaveFilter): Promise<Leave[]> {
    return this.leaves.findAll(filter);
  }
}
