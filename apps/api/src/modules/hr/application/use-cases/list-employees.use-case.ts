import { Inject, Injectable } from '@nestjs/common';
import { EmployeeFilter, EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';

@Injectable()
export class ListEmployeesUseCase {
  constructor(@Inject(EmployeeRepositoryPort) private readonly employees: EmployeeRepositoryPort) {}

  async execute(filter?: EmployeeFilter): Promise<Employee[]> {
    return this.employees.findAll(filter);
  }
}
