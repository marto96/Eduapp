import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

@Entity({ name: 'evaluations' })
export class EvaluationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ name: 'section_id' })
  sectionId: string;

  @Column({ name: 'academic_year_id' })
  academicYearId: string;

  @Column({ name: 'period_id' })
  periodId: string;

  @Column()
  category: GradeCategory;

  // 'varchar' explícito: sin el type, TypeORM no infiere una columna
  // nullable desde un tipo unión `string | null` (mismo bug ya corregido
  // en payment.orm-entity.ts / leave.orm-entity.ts — DataTypeNotSupportedError
  // al migrar).
  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  // 'real' (no 'numeric'): pg devuelve columnas numeric como string por
  // defecto para no perder precisión — acá no la necesitamos y sí un
  // number nativo de JS sin transformer extra.
  @Column({ name: 'max_score', type: 'real' })
  maxScore: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
