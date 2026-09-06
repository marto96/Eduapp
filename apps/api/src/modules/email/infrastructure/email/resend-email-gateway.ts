import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailPort, SendEmailInput } from '../../application/ports/email.port';

@Injectable()
export class ResendEmailGateway extends EmailPort {
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    super();
    this.client = new Resend(config.get<string>('RESEND_API_KEY'));
    this.fromAddress = config.get<string>('RESEND_FROM_ADDRESS')!;
  }

  async send(input: SendEmailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
