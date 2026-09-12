import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AdmissionDocumentType } from '../../domain/entities/admission-document.entity';

@Entity({ name: 'admission_documents' })
export class AdmissionDocumentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admission_application_id' })
  admissionApplicationId: string;

  @Column()
  type: AdmissionDocumentType;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'original_filename' })
  originalFilename: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'now()' })
  uploadedAt: Date;
}
