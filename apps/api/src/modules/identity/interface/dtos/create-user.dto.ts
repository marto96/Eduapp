import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { DocumentType, UserRole } from '../../domain/entities/user.entity';

const KNOWN_ROLES: UserRole[] = [
  'admin_institucion',
  'directivo',
  'docente',
  'secretaria',
  'estudiante',
  'padre_tutor',
];

const KNOWN_DOCUMENT_TYPES: DocumentType[] = ['RC', 'TI', 'CC', 'CE', 'PA'];

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

  /**
   * Datos personales — opcionales a nivel de DTO porque `CreateUserDto` se usa
   * para todos los roles (docente/secretaria/etc. no los cargan), pero el
   * formulario de matrícula de estudiante nuevo los exige en el frontend.
   */
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(KNOWN_DOCUMENT_TYPES)
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;
}
