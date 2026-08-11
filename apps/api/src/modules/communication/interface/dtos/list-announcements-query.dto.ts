import { IsIn, IsOptional } from 'class-validator';
import { AnnouncementCategory } from '../../domain/entities/announcement.entity';

const KNOWN_CATEGORIES: AnnouncementCategory[] = ['comunicado', 'circular', 'aviso'];

export class ListAnnouncementsQueryDto {
  @IsOptional()
  @IsIn(KNOWN_CATEGORIES)
  category?: AnnouncementCategory;
}
