import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../../core/auth/public.decorator';
import {
  HandlePaymentWebhookUseCase,
  PaymentWebhookInput,
} from '../../application/use-cases/handle-payment-webhook.use-case';
import {
  verifyWompiSignature,
  WompiWebhookEnvelope,
} from '../../infrastructure/payment-gateway/verify-wompi-signature';

@Controller('finance/payments')
@Public()
export class PaymentWebhookController {
  constructor(
    private readonly handleWebhook: HandlePaymentWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: PaymentWebhookInput & WompiWebhookEnvelope) {
    const valid = verifyWompiSignature({
      secret: this.config.get<string>('WOMPI_EVENTS_SECRET'),
      body,
    });
    if (!valid) throw new UnauthorizedException('Firma de webhook inválida');

    await this.handleWebhook.execute(body);
    return { ok: true };
  }
}
