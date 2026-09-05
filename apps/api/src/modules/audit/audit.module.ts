import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './interface/controllers/audit-logs.controller';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs.use-case';
import { AuditLogRepositoryPort } from './application/ports/audit-log.repository.port';
import { TypeOrmAuditLogRepository } from './infrastructure/repositories/typeorm-audit-log.repository';
import { AuditInterceptor } from './interface/audit.interceptor';

@Module({
  controllers: [AuditLogsController],
  providers: [
    RecordAuditLogUseCase,
    ListAuditLogsUseCase,
    { provide: AuditLogRepositoryPort, useClass: TypeOrmAuditLogRepository },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
