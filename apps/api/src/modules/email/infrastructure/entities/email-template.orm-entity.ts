import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

@Entity({ name: 'email_templates' })
export class EmailTemplateOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  type: EmailTemplateType;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
