import { IsIn, IsUUID, Matches } from 'class-validator';
import { DayOfWeek } from '../../domain/entities/schedule.entity';

const KNOWN_DAYS: DayOfWeek[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleDto {
  @IsUUID()
  sectionId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  academicYearId: string;

  @IsIn(KNOWN_DAYS)
  dayOfWeek: DayOfWeek;

  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime: string;
}
