import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'grade_weight_configs' })
export class GradeWeightConfigOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actividad_weight', type: 'real' })
  actividadWeight: number;

  @Column({ name: 'evaluacion_bimestral_weight', type: 'real' })
  evaluacionBimestralWeight: number;

  @Column({ name: 'disciplina_weight', type: 'real' })
  disciplinaWeight: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
