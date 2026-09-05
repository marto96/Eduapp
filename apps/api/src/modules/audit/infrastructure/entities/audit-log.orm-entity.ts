import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditLogKind } from '../../domain/entities/audit-log.entity';

@Entity({ name: 'audit_logs' })
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_email', type: 'varchar', nullable: true })
  actorEmail: string | null;

  @Column({ name: 'actor_roles', type: 'text', array: true, nullable: true })
  actorRoles: string[] | null;

  @Column()
  method: string;

  @Column()
  route: string;

  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId: string | null;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column()
  success: boolean;

  @Column()
  kind: AuditLogKind;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
