import { IsOptional, IsUUID } from 'class-validator';

export class ListLeavesQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
