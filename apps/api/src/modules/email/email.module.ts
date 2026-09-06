import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';
import { EmailTemplateRepositoryPort } from './application/ports/email-template.repository.port';
import { TypeOrmEmailTemplateRepository } from './infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplateService } from './application/services/email-template.service';
import { SendTemplatedEmailUseCase } from './application/use-cases/send-templated-email.use-case';

@Module({
  providers: [
    { provide: EmailPort, useClass: ResendEmailGateway },
    { provide: EmailTemplateRepositoryPort, useClass: TypeOrmEmailTemplateRepository },
    EmailTemplateService,
    SendTemplatedEmailUseCase,
  ],
  exports: [EmailPort, EmailTemplateRepositoryPort, SendTemplatedEmailUseCase],
})
export class EmailModule {}
