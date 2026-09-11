import { forwardRef, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PublishAnnouncementUseCase } from '../../../communication/application/use-cases/publish-announcement.use-case';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

@Injectable()
export class SetScheduleVirtualUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(forwardRef(() => PublishAnnouncementUseCase))
    private readonly publishAnnouncement: PublishAnnouncementUseCase,
  ) {}

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

    const wasVirtual = schedule.isVirtual;
    schedule.setVirtual(isVirtual);
    await this.schedules.save(schedule);

    if (isVirtual && !wasVirtual) {
      await this.publishAnnouncement.execute({
        title: 'Nueva opción de clase virtual',
        body: 'A partir de ahora, esta clase tiene una opción virtual. Vas a poder unirte desde tu horario cuando el docente inicie la videollamada.',
        category: 'aviso',
        publishedAt: new Date().toISOString(),
        publishedBy: currentUser.sub,
        sectionId: schedule.sectionId,
      });
    }

    return schedule;
  }
}
