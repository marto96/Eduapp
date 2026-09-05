import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admission_grade_closures' })
export class AdmissionGradeClosureOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'grade_id' })
  gradeId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
