import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { PaymentAttemptRepositoryPort } from '../ports/payment-attempt.repository.port';
import { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { PaymentAttempt } from '../../domain/entities/payment-attempt.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class CreatePaymentCheckoutUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
    @Inject(PaymentAttemptRepositoryPort) private readonly attempts: PaymentAttemptRepositoryPort,
    @Inject(PaymentGatewayPort) private readonly gateway: PaymentGatewayPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(chargeId: string, currentUser: JwtPayload): Promise<{ checkoutUrl: string }> {
    const charge = await this.charges.findById(chargeId);
    if (!charge) {
      throw new NotFoundException(`No existe el cargo "${chargeId}"`);
    }
    if (charge.voidedAt) {
      throw new BadRequestException('El cargo está anulado');
    }

    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds !== null && !allowedEnrollmentIds.has(charge.enrollmentId)) {
      throw new ForbiddenException('No tenés acceso a este cargo');
    }

    const existingPayments = await this.payments.findAll({ chargeId });
    const paidAmount = existingPayments
      .filter((p) => !p.voidedAt)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = charge.amount - charge.discountAmount - paidAmount;
    if (balance <= 0) {
      throw new BadRequestException('Este cargo ya está saldado');
    }

    // El `externalReference` que se manda al gateway es el id del intento
    // (generado acá, antes de crear la preferencia), no el del cargo —
    // puede haber más de un intento por cargo (reintentos), y así el
    // webhook encuentra exactamente cuál confirmar.
    const attemptId = randomUUID();
    const guardian = await this.users.findById(currentUser.sub);
    const { preferenceId, checkoutUrl } = await this.gateway.createCheckoutPreference({
      externalReference: attemptId,
      payerEmail: guardian?.email ?? '',
      item: { title: charge.description, amount: balance },
    });

    const attempt = new PaymentAttempt(
      attemptId,
      chargeId,
      currentUser.sub,
      preferenceId,
      balance,
      'pending',
      new Date().toISOString(),
    );
    await this.attempts.save(attempt);

    return { checkoutUrl };
  }
}
