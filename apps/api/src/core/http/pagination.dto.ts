import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Extendido por DTOs de query que quieran paginación (ej.
 * `ListChargesQueryDto`) — opcional en todos los casos: si no se pasan
 * `page`/`pageSize`, el caso de uso se comporta como si no existiera
 * (mismo `findAll()` completo de siempre).
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
