import { IsIn, IsOptional } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

const KNOWN_ROLES: UserRole[] = [
  'admin_institucion',
  'directivo',
  'docente',
  'secretaria',
  'estudiante',
  'padre_tutor',
];

export class ListUsersQueryDto {
  @IsOptional()
  @IsIn(KNOWN_ROLES)
  role?: UserRole;
}
