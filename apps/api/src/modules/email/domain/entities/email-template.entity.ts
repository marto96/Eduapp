export type EmailTemplateType =
  | 'solicitud_recibida'
  | 'pago_aprobado'
  | 'pago_rechazado'
  | 'solicitud_aceptada'
  | 'solicitud_rechazada'
  | 'recordatorio_pension';

export class EmailTemplate {
  constructor(
    public readonly id: string,
    public readonly type: EmailTemplateType,
    public subject: string,
    public body: string,
    public updatedAt: string,
  ) {}

  edit(subject: string, body: string): void {
    this.subject = subject;
    this.body = body;
    this.updatedAt = new Date().toISOString();
  }
}
