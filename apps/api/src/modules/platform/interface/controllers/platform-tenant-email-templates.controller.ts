import { BadGatewayException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformListTenantEmailTemplatesUseCase } from '../../application/use-cases/platform-list-tenant-email-templates.use-case';
import { PlatformUpdateTenantEmailTemplateUseCase } from '../../application/use-cases/platform-update-tenant-email-template.use-case';
import { PlatformSendTenantTestEmailUseCase } from '../../application/use-cases/platform-send-tenant-test-email.use-case';
import { UpdateEmailTemplateDto } from '../../../email/interface/dtos/update-email-template.dto';
import { SendTestEmailDto } from '../../../email/interface/dtos/send-test-email.dto';
import { EmailTemplateType } from '../../../email/domain/entities/email-template.entity';

@Controller('platform/tenants/:tenantId/email-templates')
@Public()
@UseGuards(PlatformAdminGuard)
export class PlatformTenantEmailTemplatesController {
  constructor(
    private readonly listTemplates: PlatformListTenantEmailTemplatesUseCase,
    private readonly updateTemplate: PlatformUpdateTenantEmailTemplateUseCase,
    private readonly sendTestEmail: PlatformSendTenantTestEmailUseCase,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string) {
    return this.listTemplates.execute(tenantId);
  }

  @Patch(':type')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('type') type: EmailTemplateType,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    await this.updateTemplate.execute(tenantId, type, dto);
    return { ok: true };
  }

  @Post(':type/test')
  async test(
    @Param('tenantId') tenantId: string,
    @Param('type') type: EmailTemplateType,
    @Body() dto: SendTestEmailDto,
  ) {
    try {
      await this.sendTestEmail.execute(tenantId, type, dto.to);
    } catch (err) {
      throw new BadGatewayException((err as Error).message);
    }
    return { ok: true };
  }
}
