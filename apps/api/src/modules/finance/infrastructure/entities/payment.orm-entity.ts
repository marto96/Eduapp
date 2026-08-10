import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from '../../domain/entities/payment.entity';

@Entity({ name: 'payments' })
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charge_id' })
  chargeId: string;

  @Column({ type: 'real' })
  amount: number;

  @Column()
  method: PaymentMethod;

  @Column({ name: 'paid_at', type: 'date' })
  paidAt: string;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
