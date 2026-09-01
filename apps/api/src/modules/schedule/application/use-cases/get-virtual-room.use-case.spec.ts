import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GetVirtualRoomUseCase } from './get-virtual-room.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('GetVirtualRoomUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new GetVirtualRoomUseCase(schedules);

  const user: JwtPayload = { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 'tenant-1' };

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute('sched-1', user)).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si el horario no es virtual', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
    schedules.findById.mockResolvedValue(schedule);
    await expect(useCase.execute('sched-1', user)).rejects.toThrow(BadRequestException);
  });

  it('devuelve el nombre y la url de la sala derivados de tenantId+scheduleId', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00', true);
    schedules.findById.mockResolvedValue(schedule);

    const result = await useCase.execute('sched-1', user);

    expect(result.roomName).toBe('skolaria-tenant-1-sched-1');
    expect(result.roomUrl).toBe('https://meet.jit.si/skolaria-tenant-1-sched-1');
  });
});
