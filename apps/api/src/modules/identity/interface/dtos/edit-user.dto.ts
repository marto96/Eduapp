import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
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

export class EditUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(KNOWN_ROLES, { each: true })
  roles: UserRole[];

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
