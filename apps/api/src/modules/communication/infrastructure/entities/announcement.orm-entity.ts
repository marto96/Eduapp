import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AnnouncementCategory } from '../../domain/entities/announcement.entity';

@Entity({ name: 'announcements' })
export class AnnouncementOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  category: AnnouncementCategory;

  @Column({ name: 'published_at', type: 'date' })
  publishedAt: string;

  @Column({ name: 'published_by' })
  publishedBy: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
