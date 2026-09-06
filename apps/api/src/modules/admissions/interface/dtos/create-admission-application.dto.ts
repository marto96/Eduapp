import { IsDateString, IsEmail, IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '../../../identity/domain/entities/user.entity';

const KNOWN_DOCUMENT_TYPES: DocumentType[] = ['RC', 'TI', 'CC', 'CE', 'PA'];

export class CreateAdmissionApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  studentFirstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  studentLastName: string;

  @IsDateString()
  studentBirthDate: string;

  @IsIn(KNOWN_DOCUMENT_TYPES)
  studentDocumentType: DocumentType;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  studentDocumentNumber: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  studentAddress: string;

  @IsUUID()
  gradeId: string;

  @IsUUID()
  academicYearId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  guardianName: string;

  @IsEmail()
  guardianEmail: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  guardianPhone: string;
}
