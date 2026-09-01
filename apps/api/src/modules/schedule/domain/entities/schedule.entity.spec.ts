import { Schedule } from './schedule.entity';

describe('Schedule', () => {
  const build = (isVirtual?: boolean) =>
    new Schedule(
      'sched-1',
      'section-1',
      'subject-1',
      'teacher-1',
      'year-1',
      'lunes',
      '08:00',
      '09:00',
      isVirtual,
    );

  it('isVirtual es false por defecto', () => {
    expect(build().isVirtual).toBe(false);
  });

  it('setVirtual activa la clase virtual', () => {
    const schedule = build();
    schedule.setVirtual(true);
    expect(schedule.isVirtual).toBe(true);
  });

  it('setVirtual puede desactivarla de nuevo', () => {
    const schedule = build(true);
    schedule.setVirtual(false);
    expect(schedule.isVirtual).toBe(false);
  });

  it('sigue rechazando startTime >= endTime', () => {
    expect(() => new Schedule('s', 'sec', 'subj', 't', 'y', 'lunes', '10:00', '09:00')).toThrow(
      'La hora de inicio debe ser anterior a la hora de fin',
    );
  });
});
