import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';

class ScoreEntryDto {
  @IsUUID()
  enrollmentId: string;

  @IsNumber()
  @Min(0)
  score: number;
}

export class RecordScoresDto {
  @IsUUID()
  evaluationId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores: ScoreEntryDto[];
}
