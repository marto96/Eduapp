import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeliveryMethod, DocumentRequestStatus } from '../../domain/entities/document-request.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Entity({ name: 'document_requests' })
export class DocumentRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id', type: 'uuid' })
  enrollmentId: string;

  @Column({ type: 'varchar' })
  type: DocumentType;

  @Column({ name: 'delivery_method', type: 'varchar' })
  deliveryMethod: DeliveryMethod;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'varchar' })
  status: DocumentRequestStatus;

  @Column({ name: 'charge_id', type: 'uuid', nullable: true })
  chargeId: string | null;

  @Column({ name: 'issued_document_id', type: 'uuid', nullable: true })
  issuedDocumentId: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
