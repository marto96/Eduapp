import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class EditAnnouncementDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
