import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';
import { UserRole } from '../../domain/entities/user.entity';

const KNOWN_ROLES: UserRole[] = [
  'admin_institucion',
  'directivo',
  'docente',
  'secretaria',
  'estudiante',
  'padre_tutor',
];

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(KNOWN_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsString()
  search?: string;
}
