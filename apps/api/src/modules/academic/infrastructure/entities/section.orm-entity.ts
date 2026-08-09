import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sections' })
export class SectionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'grade_id' })
  gradeId: string;

  @Column()
  name: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
