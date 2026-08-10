import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ChargeConcept } from '../../domain/entities/charge.entity';

@Entity({ name: 'charges' })
export class ChargeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id' })
  enrollmentId: string;

  @Column()
  concept: ChargeConcept;

  @Column()
  description: string;

  // 'real' (no 'numeric'): pg devuelve columnas numeric como string, ver
  // el mismo criterio en evaluation.orm-entity.ts (maxScore).
  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
