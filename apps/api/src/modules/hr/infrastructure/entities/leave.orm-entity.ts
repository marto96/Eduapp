import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { LeaveType } from '../../domain/entities/leave.entity';

@Entity({ name: 'leaves' })
export class LeaveOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column()
  type: LeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  // 'varchar' explícito: sin el type, TypeORM no infiere una columna
  // nullable desde un tipo unión `string | null` (mismo bug ya corregido
  // en payment.orm-entity.ts — DataTypeNotSupportedError al migrar).
  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
