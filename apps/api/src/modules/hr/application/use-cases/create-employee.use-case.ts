import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { Employee, ContractType } from '../../domain/entities/employee.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { UserRole } from '../../../identity/domain/entities/user.entity';

const STAFF_ROLES: UserRole[] = ['docente', 'secretaria', 'directivo', 'admin_institucion'];

export interface CreateEmployeeInput {
  userId: string;
  position: string;
  contractType: ContractType;
  hireDate: string;
}

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    @Inject(EmployeeRepositoryPort) private readonly employees: EmployeeRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<Employee> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new NotFoundException(`No existe el usuario "${input.userId}"`);
    }
    if (!STAFF_ROLES.some((role) => user.hasRole(role))) {
      throw new BadRequestException('El usuario no tiene un rol de personal (staff)');
    }

    const employee = new Employee(
      randomUUID(),
      input.userId,
      input.position,
      input.contractType,
      input.hireDate,
    );

    await this.employees.save(employee);
    return employee;
  }
}
