import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';

@Injectable()
export class TerminateEmployeeUseCase {
  constructor(@Inject(EmployeeRepositoryPort) private readonly employees: EmployeeRepositoryPort) {}

  async execute(id: string): Promise<Employee> {
    const employee = await this.employees.findById(id);
    if (!employee) {
      throw new NotFoundException(`No existe el legajo "${id}"`);
    }

    employee.terminate();
    await this.employees.save(employee);
    return employee;
  }
}
