import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GuardianLinkStatus } from '../../domain/entities/guardian-link.entity';

@Entity({ name: 'guardians' })
export class GuardianLinkOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guardian_user_id' })
  guardianUserId: string;

  @Column({ name: 'student_user_id' })
  studentUserId: string;

  @Column({ default: 'approved' })
  status: GuardianLinkStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
