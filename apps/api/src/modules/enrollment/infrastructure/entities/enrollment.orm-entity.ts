import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';

@Entity({ name: 'enrollments' })
export class EnrollmentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'section_id' })
  sectionId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ default: 'active' })
  status: EnrollmentStatus;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
