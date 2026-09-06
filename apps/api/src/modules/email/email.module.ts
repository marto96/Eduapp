import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';
import { EmailTemplateRepositoryPort } from './application/ports/email-template.repository.port';
import { TypeOrmEmailTemplateRepository } from './infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplateService } from './application/services/email-template.service';
import { SendTemplatedEmailUseCase } from './application/use-cases/send-templated-email.use-case';
import { ListEmailTemplatesUseCase } from './application/use-cases/list-email-templates.use-case';
import { UpdateEmailTemplateUseCase } from './application/use-cases/update-email-template.use-case';
import { EmailTemplatesController } from './interface/controllers/email-templates.controller';

@Module({
  controllers: [EmailTemplatesController],
  providers: [
    { provide: EmailPort, useClass: ResendEmailGateway },
    { provide: EmailTemplateRepositoryPort, useClass: TypeOrmEmailTemplateRepository },
    EmailTemplateService,
    SendTemplatedEmailUseCase,
    ListEmailTemplatesUseCase,
    UpdateEmailTemplateUseCase,
  ],
  exports: [EmailPort, EmailTemplateRepositoryPort, SendTemplatedEmailUseCase],
})
export class EmailModule {}
