export type DocumentType =
  | 'constancia_matricula'
  | 'certificado_notas'
  | 'constancia_buena_conducta'
  | 'otro';

export class IssuedDocument {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly type: DocumentType,
    public readonly description: string,
    public readonly issuedAt: string,
    public readonly issuedBy: string,
    public voidedAt: string | null = null,
  ) {}

  markVoided(): void {
    this.voidedAt = new Date().toISOString();
  }
}
