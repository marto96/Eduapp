import { FeeSchedule } from './fee-schedule.entity';

describe('FeeSchedule', () => {
  it('se construye correctamente con un monto mayor a cero', () => {
    const feeSchedule = new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', 150000);

    expect(feeSchedule.amount).toBe(150000);
  });

  it('rechaza construirse con monto cero', () => {
    expect(() => new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', 0)).toThrow(
      'El monto debe ser mayor a cero',
    );
  });

  it('rechaza construirse con monto negativo', () => {
    expect(() => new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', -100)).toThrow(
      'El monto debe ser mayor a cero',
    );
  });

  it('updateAmount actualiza el monto con un valor válido', () => {
    const feeSchedule = new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', 150000);

    feeSchedule.updateAmount(180000);

    expect(feeSchedule.amount).toBe(180000);
  });

  it('updateAmount rechaza monto cero sin mutar el valor previo', () => {
    const feeSchedule = new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', 150000);

    expect(() => feeSchedule.updateAmount(0)).toThrow('El monto debe ser mayor a cero');
    expect(feeSchedule.amount).toBe(150000);
  });

  it('updateAmount rechaza monto negativo sin mutar el valor previo', () => {
    const feeSchedule = new FeeSchedule('fs1', 'grade-1', 'year-2027', 'pension', 150000);

    expect(() => feeSchedule.updateAmount(-1)).toThrow('El monto debe ser mayor a cero');
    expect(feeSchedule.amount).toBe(150000);
  });
});
