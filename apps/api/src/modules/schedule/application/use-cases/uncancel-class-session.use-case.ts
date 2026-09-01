import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

@Injectable()
export class UncancelClassSessionUseCase {
  constructor(
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
  ) {}

  async execute(cancellationId: string, currentUser: JwtPayload): Promise<void> {
    const cancellation = await this.cancellations.findById(cancellationId);
    if (!cancellation) {
      throw new NotFoundException(`No existe la cancelación "${cancellationId}"`);
    }

    const schedule = await this.schedules.findById(cancellation.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${cancellation.scheduleId}"`);
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden revertir esta cancelación');
    }

    await this.cancellations.deleteById(cancellationId);
  }
}
