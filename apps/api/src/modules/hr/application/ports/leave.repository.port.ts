import { Leave } from '../../domain/entities/leave.entity';

export interface LeaveFilter {
  employeeId?: string;
}

export abstract class LeaveRepositoryPort {
  abstract findAll(filter?: LeaveFilter): Promise<Leave[]>;
  abstract findById(id: string): Promise<Leave | null>;
  abstract save(leave: Leave): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
