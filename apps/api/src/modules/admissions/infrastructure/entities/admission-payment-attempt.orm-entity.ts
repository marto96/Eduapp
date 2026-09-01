import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admission_payment_attempts' })
export class AdmissionPaymentAttemptOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admission_application_id' })
  admissionApplicationId: string;

  @Column({ name: 'gateway_preference_id' })
  gatewayPreferenceId: string;

  @Column({ type: 'real' })
  amount: number;

  @Column()
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
