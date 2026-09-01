import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidad de persistencia (TypeORM). Vive únicamente en infrastructure/;
 * se mapea hacia/desde la entidad de dominio en el repositorio.
 */
@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ type: 'text', array: true, default: '{}' })
  roles: string[];

  @Column({ default: 'invited' })
  status: 'active' | 'invited' | 'suspended';

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ name: 'document_type', type: 'varchar', nullable: true })
  documentType: string | null;

  @Column({ name: 'document_number', type: 'varchar', nullable: true })
  documentNumber: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;
}
