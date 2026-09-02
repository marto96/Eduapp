import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../../core/auth/public.decorator';
import {
  HandleAdmissionPaymentWebhookUseCase,
  AdmissionPaymentWebhookInput,
} from '../../application/use-cases/handle-admission-payment-webhook.use-case';
import {
  verifyWompiSignature,
  WompiWebhookEnvelope,
} from '../../../finance/infrastructure/payment-gateway/verify-wompi-signature';

@Controller('admissions/webhooks')
@Public()
export class AdmissionWebhookController {
  constructor(
    private readonly handleWebhook: HandleAdmissionPaymentWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('payment')
  @HttpCode(200)
  async webhook(@Body() body: AdmissionPaymentWebhookInput & WompiWebhookEnvelope) {
    const valid = verifyWompiSignature({
      secret: this.config.get<string>('WOMPI_EVENTS_SECRET'),
      body,
    });
    if (!valid) throw new UnauthorizedException('Firma de webhook inválida');

    await this.handleWebhook.execute(body);
    return { ok: true };
  }
}
