import { AcademicYear } from './academic-year.entity';

describe('AcademicYear', () => {
  it('crea un año lectivo válido', () => {
    const year = new AcademicYear('id-1', '2026', '2026-03-01', '2026-12-15', 'active');
    expect(year.status).toBe('active');
  });

  it('rechaza startDate posterior o igual a endDate', () => {
    expect(() => new AcademicYear('id-1', '2026', '2026-12-15', '2026-03-01', 'active')).toThrow(
      'La fecha de inicio debe ser anterior a la fecha de fin',
    );

    expect(() => new AcademicYear('id-1', '2026', '2026-03-01', '2026-03-01', 'active')).toThrow();
  });

  it('close() cambia el status a closed', () => {
    const year = new AcademicYear('id-1', '2026', '2026-03-01', '2026-12-15', 'active');
    year.close();
    expect(year.status).toBe('closed');
  });

  it('edit() actualiza nombre y fechas, y rechaza un rango inválido', () => {
    const year = new AcademicYear('id-1', '2026', '2026-03-01', '2026-12-15', 'active');
    year.edit('2027', '2027-03-01', '2027-12-15');
    expect(year.name).toBe('2027');
    expect(year.startDate).toBe('2027-03-01');
    expect(year.endDate).toBe('2027-12-15');

    expect(() => year.edit('2027', '2027-12-15', '2027-03-01')).toThrow(
      'La fecha de inicio debe ser anterior a la fecha de fin',
    );
  });
});
