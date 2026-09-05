export type AuditLogKind = 'write' | 'sensitive_read';

/**
 * Un log de auditoría es un hecho inmutable — no tiene métodos de negocio
 * ni invariantes que validar, a diferencia del resto de las entidades de
 * dominio del proyecto.
 */
export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly actorId: string | null,
    public readonly actorEmail: string | null,
    public readonly actorRoles: string[] | null,
    public readonly method: string,
    public readonly route: string,
    public readonly resourceId: string | null,
    public readonly statusCode: number | null,
    public readonly success: boolean,
    public readonly kind: AuditLogKind,
    public readonly ipAddress: string | null,
    public readonly createdAt: Date,
  ) {}
}
