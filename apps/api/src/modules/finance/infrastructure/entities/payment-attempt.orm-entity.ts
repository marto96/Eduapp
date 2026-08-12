import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentAttemptStatus } from '../../domain/entities/payment-attempt.entity';

@Entity({ name: 'payment_attempts' })
export class PaymentAttemptOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charge_id', type: 'uuid' })
  chargeId: string;

  @Column({ name: 'guardian_user_id', type: 'uuid' })
  guardianUserId: string;

  @Column({ name: 'gateway_preference_id' })
  gatewayPreferenceId: string;

  @Column({ type: 'real' })
  amount: number;

  @Column({ default: 'pending' })
  status: PaymentAttemptStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
