import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';
import { AuditLogKind } from '../../domain/entities/audit-log.entity';

const KNOWN_KINDS: AuditLogKind[] = ['write', 'sensitive_read'];

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(KNOWN_KINDS)
  kind?: AuditLogKind;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
