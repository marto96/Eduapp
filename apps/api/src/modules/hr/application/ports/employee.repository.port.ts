import { Employee } from '../../domain/entities/employee.entity';

export interface EmployeeFilter {
  userId?: string;
}

export abstract class EmployeeRepositoryPort {
  abstract findAll(filter?: EmployeeFilter): Promise<Employee[]>;
  abstract findById(id: string): Promise<Employee | null>;
  abstract save(employee: Employee): Promise<void>;
}
