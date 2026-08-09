import { AcademicYear } from './academic-year.entity';

describe('AcademicYear', () => {
  it('crea un año lectivo válido', () => {
    const year = new AcademicYear(
      'id-1',
      '2026',
      new Date('2026-03-01'),
      new Date('2026-12-15'),
      'active',
    );
    expect(year.status).toBe('active');
  });

  it('rechaza startDate posterior o igual a endDate', () => {
    expect(
      () => new AcademicYear('id-1', '2026', new Date('2026-12-15'), new Date('2026-03-01'), 'active'),
    ).toThrow('La fecha de inicio debe ser anterior a la fecha de fin');

    expect(
      () => new AcademicYear('id-1', '2026', new Date('2026-03-01'), new Date('2026-03-01'), 'active'),
    ).toThrow();
  });

  it('close() cambia el status a closed', () => {
    const year = new AcademicYear('id-1', '2026', new Date('2026-03-01'), new Date('2026-12-15'), 'active');
    year.close();
    expect(year.status).toBe('closed');
  });
});
