import { IsOptional, IsUUID } from 'class-validator';

export class ListEmployeesQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
