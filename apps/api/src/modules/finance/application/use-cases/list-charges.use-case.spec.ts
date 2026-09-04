import { ListChargesUseCase } from './list-charges.use-case';
import { ChargeRepositoryPort } from '../ports/charge.repository.port';
import { PaymentRepositoryPort } from '../ports/payment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { Charge } from '../../domain/entities/charge.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('ListChargesUseCase — búsqueda por descripción', () => {
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
  const enrollmentAccess = {
    resolveAccessibleEnrollmentIds: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;

  const useCase = new ListChargesUseCase(charges, payments, enrollmentAccess);
  const staffUser = { sub: 'u-1', roles: ['secretaria'] } as JwtPayload;

  const chargeA = new Charge('c-1', 'e-1', 'pension', 'Pensión marzo 2026', 150000, '2026-03-10');
  const chargeB = new Charge('c-2', 'e-2', 'matricula', 'Matrícula 2026', 500000, '2026-01-15');

  beforeEach(() => {
    jest.clearAllMocks();
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(null);
    payments.findAll.mockResolvedValue([]);
  });

  it('sin búsqueda, devuelve todos los cargos visibles', async () => {
    charges.findAll.mockResolvedValue([chargeA, chargeB]);

    const result = await useCase.execute(undefined, staffUser);

    expect(result).toHaveLength(2);
  });

  it('filtra por descripción, sin distinguir mayúsculas', async () => {
    charges.findAll.mockResolvedValue([chargeA, chargeB]);

    const result = await useCase.execute({ search: 'pensión' }, staffUser);

    expect(result).toHaveLength(1);
    expect((result as Charge[])[0].id).toBe('c-1');
  });

  it('sin coincidencias, devuelve vacío', async () => {
    charges.findAll.mockResolvedValue([chargeA, chargeB]);

    const result = await useCase.execute({ search: 'inexistente' }, staffUser);

    expect(result).toHaveLength(0);
  });

  it('combina búsqueda con paginación — total refleja lo filtrado, no el universo completo', async () => {
    charges.findAll.mockResolvedValue([chargeA, chargeB]);

    const result = await useCase.execute({ search: 'pensión', page: 1, pageSize: 10 }, staffUser);

    expect(result).toEqual(
      expect.objectContaining({ total: 1, page: 1, pageSize: 10 }),
    );
  });

  it('con page/pageSize, cae al pageSize default si el pedido no es válido', async () => {
    charges.findAll.mockResolvedValue([chargeA, chargeB]);

    const result = await useCase.execute({ page: 1, pageSize: 999 }, staffUser);

    expect((result as { pageSize: number }).pageSize).toBe(25);
  });
});
