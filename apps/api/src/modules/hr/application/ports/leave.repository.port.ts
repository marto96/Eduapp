import { Leave } from '../../domain/entities/leave.entity';

export interface LeaveFilter {
  employeeId?: string;
}

export abstract class LeaveRepositoryPort {
  abstract findAll(filter?: LeaveFilter): Promise<Leave[]>;
  abstract save(leave: Leave): Promise<void>;
}
