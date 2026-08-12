import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'announcement_reads' })
export class AnnouncementReadOrmEntity {
  @PrimaryColumn({ name: 'announcement_id', type: 'uuid' })
  announcementId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'read_at', type: 'timestamptz', default: () => 'now()' })
  readAt: Date;
}
