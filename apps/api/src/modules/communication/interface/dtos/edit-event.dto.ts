import { IsISO8601, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class EditEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsISO8601()
  startsAt: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
