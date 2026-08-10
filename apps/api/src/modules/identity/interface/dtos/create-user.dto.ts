import { ArrayMinSize, IsArray, IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

const KNOWN_ROLES: UserRole[] = [
  'admin_institucion',
  'directivo',
  'docente',
  'secretaria',
  'estudiante',
  'padre_tutor',
];

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(KNOWN_ROLES, { each: true })
  roles: UserRole[];
}
