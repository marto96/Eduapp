import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeaveType } from '../../domain/entities/leave.entity';

const KNOWN_TYPES: LeaveType[] = ['vacaciones', 'enfermedad', 'personal', 'otro'];

export class CreateLeaveDto {
  @IsUUID()
  employeeId: string;

  @IsIn(KNOWN_TYPES)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
