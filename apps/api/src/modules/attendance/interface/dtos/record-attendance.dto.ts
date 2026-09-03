import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsUUID, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '../../domain/entities/attendance-record.entity';

const KNOWN_STATUSES: AttendanceStatus[] = ['presente', 'ausente', 'tarde', 'justificado'];

class AttendanceEntryDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_STATUSES)
  status: AttendanceStatus;
}

export class RecordAttendanceDto {
  @IsUUID()
  scheduleId: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records: AttendanceEntryDto[];
}
