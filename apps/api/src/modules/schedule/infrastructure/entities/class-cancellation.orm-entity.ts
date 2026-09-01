import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'class_cancellations' })
export class ClassCancellationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id' })
  scheduleId: string;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({ name: 'cancelled_by' })
  cancelledBy: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
