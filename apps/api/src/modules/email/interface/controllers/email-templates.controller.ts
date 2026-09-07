import { BadGatewayException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListEmailTemplatesUseCase } from '../../application/use-cases/list-email-templates.use-case';
import { UpdateEmailTemplateUseCase } from '../../application/use-cases/update-email-template.use-case';
import { SendTestEmailUseCase } from '../../application/use-cases/send-test-email.use-case';
import { UpdateEmailTemplateDto } from '../dtos/update-email-template.dto';
import { SendTestEmailDto } from '../dtos/send-test-email.dto';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

@Controller('email-templates')
@CheckPolicies((ability) => ability.can('manage', 'EmailTemplate'))
export class EmailTemplatesController {
  constructor(
    private readonly listTemplates: ListEmailTemplatesUseCase,
    private readonly updateTemplate: UpdateEmailTemplateUseCase,
    private readonly sendTestEmail: SendTestEmailUseCase,
  ) {}

  @Get()
  async list() {
    return this.listTemplates.execute();
  }

  @Patch(':type')
  async update(@Param('type') type: EmailTemplateType, @Body() dto: UpdateEmailTemplateDto) {
    await this.updateTemplate.execute(type, dto);
    return { ok: true };
  }

  @Post(':type/test')
  async test(@Param('type') type: EmailTemplateType, @Body() dto: SendTestEmailDto) {
    try {
      await this.sendTestEmail.execute(type, dto.to);
    } catch (err) {
      throw new BadGatewayException((err as Error).message);
    }
    return { ok: true };
  }
}
