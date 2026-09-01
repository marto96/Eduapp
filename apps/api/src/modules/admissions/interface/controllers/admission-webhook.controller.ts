import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../../../core/auth/public.decorator';
import {
  HandleAdmissionPaymentWebhookUseCase,
  AdmissionPaymentWebhookInput,
} from '../../application/use-cases/handle-admission-payment-webhook.use-case';
import { verifyMercadoPagoSignature } from '../../../finance/infrastructure/payment-gateway/verify-mercadopago-signature';

@Controller('admissions/webhooks')
@Public()
export class AdmissionWebhookController {
  constructor(
    private readonly handleWebhook: HandleAdmissionPaymentWebhookUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('payment')
  @HttpCode(200)
  async webhook(
    @Body() body: AdmissionPaymentWebhookInput,
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
