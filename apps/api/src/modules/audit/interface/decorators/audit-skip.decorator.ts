import { SetMetadata } from '@nestjs/common';

export const AUDIT_SKIP_KEY = 'audit_skip';

/**
 * Excluye un endpoint de escritura del log de auditoría — para acciones de
 * alto volumen y sin valor de auditoría (refresh de token, marcar como
 * leído), que de otro modo saturarían el log dentro de pocos días de uso
 * real.
 */
export const AuditSkip = () => SetMetadata(AUDIT_SKIP_KEY, true);
