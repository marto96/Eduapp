import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { DocumentType } from '../../domain/entities/user.entity';

const KNOWN_DOCUMENT_TYPES: DocumentType[] = ['RC', 'TI', 'CC', 'CE', 'PA'];

/**
 * A diferencia de `EditUserDto` (admin editando a otro usuario), este DTO
 * NUNCA incluye `email` ni `roles` — la autoedición no puede tocarlos.
 */
export class EditMyProfileDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

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

  @IsOptional()
  @IsString()
  phone?: string;
}
