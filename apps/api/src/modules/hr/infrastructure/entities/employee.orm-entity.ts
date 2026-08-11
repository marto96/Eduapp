import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ContractType, EmployeeStatus } from '../../domain/entities/employee.entity';

@Entity({ name: 'employees' })
export class EmployeeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  position: string;

  @Column({ name: 'contract_type' })
  contractType: ContractType;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: string;

  @Column({ default: 'activo' })
  status: EmployeeStatus;

  @Column({ type: 'real', nullable: true })
  salary: number | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
