import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

@Injectable()
export class SetScheduleVirtualUseCase {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async execute(scheduleId: string, isVirtual: boolean, currentUser: JwtPayload): Promise<Schedule> {
    const schedule = await this.schedules.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${scheduleId}"`);
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden gestionar esta clase');
    }

    schedule.setVirtual(isVirtual);
    await this.schedules.save(schedule);
    return schedule;
  }
}
