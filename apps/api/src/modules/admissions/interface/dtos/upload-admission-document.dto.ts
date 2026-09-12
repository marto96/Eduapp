import { IsIn } from 'class-validator';
import { AdmissionDocumentType } from '../../domain/entities/admission-document.entity';

export const KNOWN_ADMISSION_DOCUMENT_TYPES: AdmissionDocumentType[] = [
  'partida_nacimiento',
  'documento_identidad_estudiante',
  'documento_identidad_acudiente',
  'foto',
];

export class UploadAdmissionDocumentDto {
  @IsIn(KNOWN_ADMISSION_DOCUMENT_TYPES)
  type: AdmissionDocumentType;
}
