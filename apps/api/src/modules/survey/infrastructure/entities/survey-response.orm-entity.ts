import { Column, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'survey_responses' })
export class SurveyResponseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id' })
  surveyId: string;

  @Column({ name: 'respondent_id' })
  respondentId: string;

  @Column({ name: 'selected_option' })
  selectedOption: string;

  @Column({ name: 'responded_at', type: 'timestamptz' })
  respondedAt: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
