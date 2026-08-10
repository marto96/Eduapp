import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DayOfWeek } from '../../domain/entities/schedule.entity';

const KNOWN_DAYS: DayOfWeek[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export class ListSchedulesQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsIn(KNOWN_DAYS)
  dayOfWeek?: DayOfWeek;
}
