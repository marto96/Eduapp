import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepositoryPort, RecordAuditLogEntry } from '../ports/audit-log.repository.port';

@Injectable()
export class RecordAuditLogUseCase {
  constructor(@Inject(AuditLogRepositoryPort) private readonly auditLogs: AuditLogRepositoryPort) {}

  async execute(entry: RecordAuditLogEntry): Promise<void> {
    await this.auditLogs.record(entry);
  }
}
