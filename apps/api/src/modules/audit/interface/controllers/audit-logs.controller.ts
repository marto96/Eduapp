import { Controller, Get, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListAuditLogsUseCase } from '../../application/use-cases/list-audit-logs.use-case';
import { ListAuditLogsQueryDto } from '../dtos/list-audit-logs-query.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly listAuditLogs: ListAuditLogsUseCase) {}

  @Get()
  @CheckPolicies((ability) => ability.can('read', 'AuditLog'))
  async list(@Query() query: ListAuditLogsQueryDto) {
    return this.listAuditLogs.execute(query);
  }
}
