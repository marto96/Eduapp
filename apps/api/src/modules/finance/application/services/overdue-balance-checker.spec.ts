import { OverdueBalanceChecker } from './overdue-balance-checker';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { Charge } from '../../domain/entities/charge.entity';
import { Payment } from '../../domain/entities/payment.entity';

describe('OverdueBalanceChecker', () => {
  const charges: jest.Mocked<ChargeRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const payments: jest.Mocked<PaymentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const checker = new OverdueBalanceChecker(charges, payments);

  const PAST = '2000-01-01';
  const FUTURE = '2999-01-01';

  function charge(id: string, dueDate: string, amount = 100000, opts: { discountAmount?: number; voidedAt?: string | null } = {}) {
    return new Charge(id, 'enr-1', 'pension', 'Pensión', amount, dueDate, opts.discountAmount ?? 0, null, opts.voidedAt ?? null);
  }

  function payment(chargeId: string, amount: number, voidedAt: string | null = null) {
    return new Payment(`pay-${chargeId}-${amount}`, chargeId, amount, 'efectivo', '2026-01-01', undefined, voidedAt);
  }

  beforeEach(() => jest.clearAllMocks());

  it('sin matrículas, da false sin consultar cargos', async () => {
    const result = await checker.hasOverdueBalance([]);

    expect(result).toBe(false);
    expect(charges.findAll).not.toHaveBeenCalled();
  });

  it('sin cargos, da false', async () => {
    charges.findAll.mockResolvedValue([]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(false);
  });

  it('cargo futuro impago, da false', async () => {
    charges.findAll.mockResolvedValue([charge('c1', FUTURE)]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(false);
    expect(payments.findAll).not.toHaveBeenCalled();
  });

  it('cargo vencido impago, da true', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST)]);
    payments.findAll.mockResolvedValue([]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(true);
  });

  it('cargo vencido pagado por completo, da false', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST, 100000)]);
    payments.findAll.mockResolvedValue([payment('c1', 100000)]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(false);
  });

  it('cargo vencido anulado, da false aunque esté impago', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST, 100000, { voidedAt: '2026-01-01T00:00:00.000Z' })]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(false);
    expect(payments.findAll).not.toHaveBeenCalled();
  });

  it('cargo vencido con pago parcial, da true', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST, 100000)]);
    payments.findAll.mockResolvedValue([payment('c1', 40000)]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(true);
  });

  it('un cargo al día más uno vencido impago, da true', async () => {
    charges.findAll.mockResolvedValue([charge('c1', FUTURE), charge('c2', PAST)]);
    payments.findAll.mockResolvedValue([]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(true);
  });

  it('un pago anulado no cuenta como pagado', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST, 100000)]);
    payments.findAll.mockResolvedValue([payment('c1', 100000, '2026-01-01T00:00:00.000Z')]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(true);
  });

  it('consulta cargos y pagos en batch, no en loop', async () => {
    charges.findAll.mockResolvedValue([charge('c1', PAST), charge('c2', PAST)]);
    payments.findAll.mockResolvedValue([]);

    await checker.hasOverdueBalance(['enr-1', 'enr-2']);

    expect(charges.findAll).toHaveBeenCalledTimes(1);
    expect(charges.findAll).toHaveBeenCalledWith({ enrollmentIds: ['enr-1', 'enr-2'] });
    expect(payments.findAll).toHaveBeenCalledTimes(1);
    expect(payments.findAll).toHaveBeenCalledWith({ chargeIds: ['c1', 'c2'] });
  });

  it('un cargo que vence hoy todavía no cuenta como vencido', async () => {
    const today = new Date().toISOString().slice(0, 10);
    charges.findAll.mockResolvedValue([charge('c1', today)]);

    const result = await checker.hasOverdueBalance(['enr-1']);

    expect(result).toBe(false);
    expect(payments.findAll).not.toHaveBeenCalled();
  });
});
