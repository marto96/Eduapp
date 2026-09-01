import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DayOfWeek } from '../../domain/entities/schedule.entity';

@Entity({ name: 'schedules' })
export class ScheduleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'section_id' })
  sectionId: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'day_of_week' })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column({ name: 'end_time' })
  endTime: string;

  @Column({ name: 'is_virtual', default: false })
  isVirtual: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
