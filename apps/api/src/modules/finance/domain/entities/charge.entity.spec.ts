import { Charge } from './charge.entity';

describe('Charge — computeBalance()', () => {
  it('calcula el saldo como monto menos descuento menos lo pagado', () => {
    const charge = new Charge('c1', 'enr-1', 'pension', 'Pensión agosto', 100000, '2026-08-01', 10000);

    expect(charge.computeBalance(50000)).toBe(40000); // 100000 - 10000 - 50000
  });

  it('da saldo cero cuando lo pagado cubre el monto neto exacto', () => {
    const charge = new Charge('c1', 'enr-1', 'pension', 'Pensión agosto', 100000, '2026-08-01', 10000);

    expect(charge.computeBalance(90000)).toBe(0);
  });

  it('da saldo negativo cuando se pagó de más', () => {
    const charge = new Charge('c1', 'enr-1', 'pension', 'Pensión agosto', 100000, '2026-08-01');

    expect(charge.computeBalance(120000)).toBe(-20000);
  });

  it('sin descuento ni pagos, el saldo es el monto completo', () => {
    const charge = new Charge('c1', 'enr-1', 'matricula', 'Matrícula', 50000, '2026-08-01');

    expect(charge.computeBalance(0)).toBe(50000);
  });
});
