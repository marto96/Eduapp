export type AdmissionDocumentType =
  | 'partida_nacimiento'
  | 'documento_identidad_estudiante'
  | 'documento_identidad_acudiente'
  | 'foto';

export class AdmissionDocument {
  constructor(
    public readonly id: string,
    public readonly admissionApplicationId: string,
    public readonly type: AdmissionDocumentType,
    public storageKey: string,
    public originalFilename: string,
    public uploadedAt: string,
  ) {}

  replace(storageKey: string, originalFilename: string): void {
    this.storageKey = storageKey;
    this.originalFilename = originalFilename;
    this.uploadedAt = new Date().toISOString();
  }
}
