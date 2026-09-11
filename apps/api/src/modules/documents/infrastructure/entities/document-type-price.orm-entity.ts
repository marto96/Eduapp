import { Column, Entity, PrimaryColumn } from 'typeorm';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Entity({ name: 'document_type_prices' })
export class DocumentTypePriceOrmEntity {
  @PrimaryColumn({ type: 'varchar' })
  type: DocumentType;

  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
