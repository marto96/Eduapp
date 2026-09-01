import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ChargeConcept } from '../../domain/entities/charge.entity';

@Entity({ name: 'fee_schedules' })
export class FeeScheduleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'grade_id' })
  gradeId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column()
  concept: ChargeConcept;

  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
