import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { ListEmailTemplatesUseCase } from '../../application/use-cases/list-email-templates.use-case';
import { UpdateEmailTemplateUseCase } from '../../application/use-cases/update-email-template.use-case';
import { UpdateEmailTemplateDto } from '../dtos/update-email-template.dto';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

@Controller('email-templates')
@CheckPolicies((ability) => ability.can('manage', 'EmailTemplate'))
export class EmailTemplatesController {
  constructor(
    private readonly listTemplates: ListEmailTemplatesUseCase,
    private readonly updateTemplate: UpdateEmailTemplateUseCase,
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
}
