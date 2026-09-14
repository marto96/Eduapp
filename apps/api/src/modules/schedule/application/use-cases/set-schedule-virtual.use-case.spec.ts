import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetScheduleVirtualUseCase } from './set-schedule-virtual.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PublishAnnouncementUseCase } from '../../../communication/application/use-cases/publish-announcement.use-case';

describe('SetScheduleVirtualUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const publishAnnouncement = { execute: jest.fn() } as unknown as jest.Mocked<PublishAnnouncementUseCase>;

  const useCase = new SetScheduleVirtualUseCase(schedules, publishAnnouncement);

  const schedule = () =>
    new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute('sched-1', true, user())).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si el actor no es ni el docente dueño ni un directivo/admin', async () => {
    schedules.findById.mockResolvedValue(schedule());
    await expect(
      useCase.execute('sched-1', true, user({ sub: 'otro-docente', roles: ['docente'] })),
    ).rejects.toThrow(ForbiddenException);
    expect(schedules.save).not.toHaveBeenCalled();
  });

  it('el docente dueño puede activar su propia clase virtual', async () => {
    schedules.findById.mockResolvedValue(schedule());
    const result = await useCase.execute('sched-1', true, user());
    expect(result.isVirtual).toBe(true);
    expect(schedules.save).toHaveBeenCalledWith(expect.objectContaining({ isVirtual: true }));
  });

  it('activar la clase virtual libera el aula asignada', async () => {
    const existing = schedule();
    existing.classroomId = 'classroom-1';
    schedules.findById.mockResolvedValue(existing);
    const result = await useCase.execute('sched-1', true, user());
    expect(result.classroomId).toBeNull();
    expect(schedules.save).toHaveBeenCalledWith(expect.objectContaining({ classroomId: null }));
  });

  it('un directivo puede activar la clase virtual de cualquier docente', async () => {
    schedules.findById.mockResolvedValue(schedule());
    const result = await useCase.execute('sched-1', true, user({ sub: 'director-1', roles: ['directivo'] }));
    expect(result.isVirtual).toBe(true);
  });

  it('puede desactivarla de nuevo', async () => {
    const existing = schedule();
    existing.setVirtual(true);
    schedules.findById.mockResolvedValue(existing);
    const result = await useCase.execute('sched-1', false, user());
    expect(result.isVirtual).toBe(false);
  });

  it('publica un aviso a la sección al activar la clase virtual por primera vez', async () => {
    schedules.findById.mockResolvedValue(schedule());
    await useCase.execute('sched-1', true, user());
    expect(publishAnnouncement.execute).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'aviso', sectionId: 'section-1', publishedBy: 'teacher-1' }),
    );
  });

  it('no publica un aviso nuevo si la clase ya era virtual', async () => {
    const existing = schedule();
    existing.setVirtual(true);
    schedules.findById.mockResolvedValue(existing);
    await useCase.execute('sched-1', true, user());
    expect(publishAnnouncement.execute).not.toHaveBeenCalled();
  });

  it('no publica un aviso al desactivar la clase virtual', async () => {
    const existing = schedule();
    existing.setVirtual(true);
    schedules.findById.mockResolvedValue(existing);
    await useCase.execute('sched-1', false, user());
    expect(publishAnnouncement.execute).not.toHaveBeenCalled();
  });
});
