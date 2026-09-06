import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pension_reminder_log' })
export class PensionReminderLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'charge_id', type: 'uuid', unique: true })
  chargeId: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
