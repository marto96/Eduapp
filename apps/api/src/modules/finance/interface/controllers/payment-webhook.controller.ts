import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../../core/auth/public.decorator';
import {
  HandlePaymentWebhookUseCase,
  PaymentWebhookInput,
} from '../../application/use-cases/handle-payment-webhook.use-case';
import { verifyMercadoPagoSignature } from '../../infrastructure/payment-gateway/verify-mercadopago-signature';

@Controller('finance/payments')
@Public()
export class PaymentWebhookController {
  constructor(
    private readonly handleWebhook: HandlePaymentWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() body: PaymentWebhookInput,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
  ) {
    if (body.data?.id) {
      const valid = verifyMercadoPagoSignature({
        secret: this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET'),
        xSignature,
        xRequestId,
        dataId: body.data.id,
      });
      if (!valid) throw new UnauthorizedException('Firma de webhook inválida');
    }

    await this.handleWebhook.execute(body);
    return { ok: true };
  }
}
