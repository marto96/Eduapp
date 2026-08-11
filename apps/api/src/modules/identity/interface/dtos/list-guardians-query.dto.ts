import { IsOptional, IsUUID } from 'class-validator';

export class ListGuardiansQueryDto {
  @IsOptional()
  @IsUUID()
  guardianUserId?: string;

  @IsOptional()
  @IsUUID()
  studentUserId?: string;
}
