import { Inject, Injectable } from '@nestjs/common';
import { ChargeFilter, ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Charge } from '../../domain/entities/charge.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export type ChargeStatus = 'pendiente' | 'parcial' | 'pagado' | 'anulado';

export interface ChargeWithBalance extends Charge {
  paidAmount: number;
  netAmount: number;
  balance: number;
  status: ChargeStatus;
}

export interface ListChargesInput extends ChargeFilter {
  status?: ChargeStatus;
  page?: number;
  pageSize?: number;
  /** Coincidencia parcial, sin distinguir mayúsculas, contra la descripción del cargo. */
  search?: string;
}

@Injectable()
export class ListChargesUseCase {
  constructor(
    @Inject(ChargeRepositoryPort) private readonly charges: ChargeRepositoryPort,
    @Inject(PaymentRepositoryPort) private readonly payments: PaymentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(
    input: ListChargesInput | undefined,
    currentUser: JwtPayload,
  ): Promise<ChargeWithBalance[] | PaginatedResult<ChargeWithBalance>> {
    const paginate = (result: ChargeWithBalance[]) => this.applyPagination(result, input);

    const charges = await this.charges.findAll(input);
    if (charges.length === 0) return paginate([]);

    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    const visibleCharges =
      allowedEnrollmentIds === null
        ? charges
        : charges.filter((c) => allowedEnrollmentIds.has(c.enrollmentId));
    if (visibleCharges.length === 0) return paginate([]);

    const allPayments = await this.payments.findAll({ chargeIds: visibleCharges.map((c) => c.id) });
    const paidByCharge = new Map<string, number>();
    for (const payment of allPayments) {
      if (payment.voidedAt) continue; // un pago anulado no cuenta para el saldo
      paidByCharge.set(payment.chargeId, (paidByCharge.get(payment.chargeId) ?? 0) + payment.amount);
    }

    const enriched = visibleCharges.map((charge) => {
      const paidAmount = paidByCharge.get(charge.id) ?? 0;
      const netAmount = charge.amount - charge.discountAmount;
      const balance = charge.computeBalance(paidAmount);
      // balance <= 0 cubre tanto "pagado con plata" como "cubierto por
      // completo con una beca/descuento, sin ningún pago registrado" —
      // antes de discountAmount alcanzaba con mirar paidAmount, ya no.
      const status: ChargeStatus = charge.voidedAt
        ? 'anulado'
        : balance <= 0
          ? 'pagado'
          : paidAmount > 0
            ? 'parcial'
            : 'pendiente';
      return { ...charge, paidAmount, netAmount, balance, status } as ChargeWithBalance;
    });

    const byStatus = input?.status ? enriched.filter((c) => c.status === input.status) : enriched;
    const search = input?.search?.trim().toLowerCase();
    const filtered = search
      ? byStatus.filter((c) => c.description.toLowerCase().includes(search))
      : byStatus;
    return paginate(filtered);
  }

  /**
   * Pagina sobre el resultado ya filtrado, no sobre `findAll()` — `status`
   * es un campo derivado (calculado acá, no una columna), así que paginar
   * en el repositorio antes de filtrar por status daría un `total` y un
   * contenido de página incorrectos. Sin `page`/`pageSize` en el input,
   * devuelve el array tal cual (comportamiento sin cambios).
   */
  private applyPagination(
    result: ChargeWithBalance[],
    input: ListChargesInput | undefined,
  ): ChargeWithBalance[] | PaginatedResult<ChargeWithBalance> {
    if (!input?.page && !input?.pageSize) return result;
    const { page, pageSize } = normalizePagination(input.page, input.pageSize);
    const start = (page - 1) * pageSize;
    return { items: result.slice(start, start + pageSize), total: result.length, page, pageSize };
  }
}
