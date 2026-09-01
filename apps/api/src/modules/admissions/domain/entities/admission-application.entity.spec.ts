import { AdmissionApplication } from './admission-application.entity';

describe('AdmissionApplication', () => {
  const build = () =>
    new AdmissionApplication(
      'app-1',
      'SOL-A8F3K2',
      'Juan',
      'Pérez',
      '2015-05-20',
      'TI',
      '1098765432',
      'Calle 1 # 2-3',
      'grade-1',
      'year-2026',
      'María Pérez',
      'maria@test.com',
      '3001234567',
      'pendiente_pago',
      150000,
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-01-01T00:00:00.000Z',
    );

  it('markPaid() pasa a pendiente_entrevista y completa paidAt', () => {
    const app = build();
    app.markPaid();
    expect(app.status).toBe('pendiente_entrevista');
    expect(app.paidAt).not.toBeNull();
  });

  it('markPaid() es idempotente: no hace nada si ya no está pendiente_pago', () => {
    const app = build();
    app.markPaid();
    const firstPaidAt = app.paidAt;
    app.markPaid();
    expect(app.paidAt).toBe(firstPaidAt);
  });

  it('recordInterview() carga fecha y notas', () => {
    const app = build();
    app.recordInterview('2026-02-01T10:00:00.000Z', 'Buena entrevista');
    expect(app.interviewDate).toBe('2026-02-01T10:00:00.000Z');
    expect(app.interviewNotes).toBe('Buena entrevista');
  });

  it('accept() pasa a aceptada y guarda el matchedUserId', () => {
    const app = build();
    app.accept('user-99');
    expect(app.status).toBe('aceptada');
    expect(app.matchedUserId).toBe('user-99');
  });

  it('accept() acepta matchedUserId null (aspirante nuevo)', () => {
    const app = build();
    app.accept(null);
    expect(app.matchedUserId).toBeNull();
  });

  it('reject() pasa a rechazada y guarda el motivo', () => {
    const app = build();
    app.reject('No cumple requisitos de edad');
    expect(app.status).toBe('rechazada');
    expect(app.rejectionReason).toBe('No cumple requisitos de edad');
  });

  it('linkEnrollment() completa resultingEnrollmentId', () => {
    const app = build();
    app.linkEnrollment('enrollment-1');
    expect(app.resultingEnrollmentId).toBe('enrollment-1');
  });
});
