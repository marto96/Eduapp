import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'platform_admins' })
export class PlatformAdminOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ default: 'active' })
  status: 'active' | 'suspended';

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
