import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bank_transactions' })
export class BankTransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric' })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'imported_at', type: 'timestamptz', default: () => 'now()' })
  importedAt: Date;

  @Column({ name: 'matched_payment_id', type: 'uuid', nullable: true })
  matchedPaymentId: string | null;
}
