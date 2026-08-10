import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  EmployeeFilter,
  EmployeeRepositoryPort,
} from '../../application/ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeOrmEntity } from '../entities/employee.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEmployeeRepository extends EmployeeRepositoryPort {
  private readonly repo: Repository<EmployeeOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EmployeeOrmEntity);
  }

  async findAll(filter?: EmployeeFilter): Promise<Employee[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.userId && { userId: filter.userId }),
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Employee | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(employee: Employee): Promise<void> {
    await this.repo.save({
      id: employee.id,
      userId: employee.userId,
      position: employee.position,
      contractType: employee.contractType,
      hireDate: employee.hireDate,
      status: employee.status,
    });
  }

  private toDomain(row: EmployeeOrmEntity): Employee {
    return new Employee(
      row.id,
      row.userId,
      row.position,
      row.contractType,
      row.hireDate,
      row.status,
    );
  }
}
