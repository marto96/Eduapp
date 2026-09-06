import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';
import { EmailTemplateRepositoryPort } from './application/ports/email-template.repository.port';
import { TypeOrmEmailTemplateRepository } from './infrastructure/repositories/typeorm-email-template.repository';
import { EmailTemplateService } from './application/services/email-template.service';

@Module({
  providers: [
    { provide: EmailPort, useClass: ResendEmailGateway },
    { provide: EmailTemplateRepositoryPort, useClass: TypeOrmEmailTemplateRepository },
    EmailTemplateService,
  ],
  exports: [EmailPort, EmailTemplateRepositoryPort],
})
export class EmailModule {}
