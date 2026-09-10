import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformListTenantAuditLogsUseCase } from '../../application/use-cases/platform-list-tenant-audit-logs.use-case';
import { PlatformExportTenantAuditLogsUseCase } from '../../application/use-cases/platform-export-tenant-audit-logs.use-case';
import { ListAuditLogsQueryDto } from '../../../audit/interface/dtos/list-audit-logs-query.dto';

@Controller('platform/tenants/:tenantId/audit-logs')
@Public()
@UseGuards(PlatformAdminGuard)
export class PlatformTenantAuditController {
  constructor(
    private readonly listAuditLogs: PlatformListTenantAuditLogsUseCase,
    private readonly exportAuditLogs: PlatformExportTenantAuditLogsUseCase,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string, @Query() query: ListAuditLogsQueryDto) {
    return this.listAuditLogs.execute(tenantId, query);
  }

  @Get('export')
  async export(
    @Param('tenantId') tenantId: string,
    @Query() query: ListAuditLogsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.exportAuditLogs.execute(tenantId, {
      search: query.search,
      kind: query.kind,
      from: query.from,
      to: query.to,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="auditoria.csv"');
    res.send(csv);
  }
}
