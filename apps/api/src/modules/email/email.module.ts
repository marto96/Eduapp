import { Module } from '@nestjs/common';
import { EmailPort } from './application/ports/email.port';
import { ResendEmailGateway } from './infrastructure/email/resend-email-gateway';

@Module({
  providers: [{ provide: EmailPort, useClass: ResendEmailGateway }],
  exports: [EmailPort],
})
export class EmailModule {}
