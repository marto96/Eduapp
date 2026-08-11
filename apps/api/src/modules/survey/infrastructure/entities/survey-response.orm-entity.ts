import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SurveyAnswer } from '../../domain/entities/survey-response.entity';

@Entity({ name: 'survey_responses' })
export class SurveyResponseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id' })
  surveyId: string;

  @Column({ name: 'respondent_id' })
  respondentId: string;

  @Column({ type: 'jsonb' })
  answers: SurveyAnswer[];

  @Column({ name: 'responded_at', type: 'timestamptz' })
  respondedAt: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
