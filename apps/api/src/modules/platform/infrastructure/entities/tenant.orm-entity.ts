import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Vive en el schema `public` (ver platform.datasource.ts), no en el de tenant.
 */
@Entity({ name: 'tenants' })
export class TenantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ name: 'custom_domain', type: 'varchar', nullable: true, unique: true })
  customDomain: string | null;

  @Column({ name: 'schema_name', unique: true })
  schemaName: string;

  @Column({ default: 'active' })
  status: 'active' | 'suspended';

  @Column({ name: 'enabled_modules', type: 'text', array: true, default: '{}' })
  enabledModules: string[];

  @Column({ name: 'primary_color', type: 'varchar', nullable: true })
  primaryColor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
