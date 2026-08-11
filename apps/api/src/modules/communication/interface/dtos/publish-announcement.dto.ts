import { IsDateString, IsIn, IsString, MinLength } from 'class-validator';
import { AnnouncementCategory } from '../../domain/entities/announcement.entity';

const KNOWN_CATEGORIES: AnnouncementCategory[] = ['comunicado', 'circular', 'aviso'];

export class PublishAnnouncementDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsIn(KNOWN_CATEGORIES)
  category: AnnouncementCategory;

  @IsDateString()
  publishedAt: string;
}
