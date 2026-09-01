import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { DayOfWeek } from '../../domain/entities/schedule.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];
const DUPLICATE_MESSAGE = 'Ya existe una cancelación registrada para esa fecha';

const DAYS_BY_INDEX: (DayOfWeek | null)[] = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function dayOfWeekOf(date: string): DayOfWeek | null {
  return DAYS_BY_INDEX[new Date(`${date}T00:00:00`).getDay()];
}

function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CancelClassSessionInput {
  scheduleId: string;
  date: string;
  reason?: string;
}

@Injectable()
export class CancelClassSessionUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
  ) {}

  async execute(input: CancelClassSessionInput, currentUser: JwtPayload): Promise<ClassCancellation> {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${input.scheduleId}"`);
    }
    if (!schedule.isVirtual) {
      throw new BadRequestException('Esta clase no tiene videollamada habilitada');
    }

    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    if (!isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado o un directivo pueden cancelar esta clase');
    }

    if (dayOfWeekOf(input.date) !== schedule.dayOfWeek) {
      throw new BadRequestException('Esa fecha no corresponde al día de este horario');
    }
    if (input.date < todayLocalDate()) {
      throw new BadRequestException('No se puede cancelar una clase que ya pasó');
    }

    const existing = await this.cancellations.findOne(input.scheduleId, input.date);
    if (existing) {
      throw new ConflictException(DUPLICATE_MESSAGE);
    }

    const cancellation = new ClassCancellation(
      randomUUID(),
      input.scheduleId,
      input.date,
      currentUser.sub,
      input.reason ?? null,
    );

    try {
      await this.cancellations.save(cancellation);
    } catch (err) {
      // Defensa en profundidad: el `findOne` de arriba tiene una ventana de
      // carrera; el índice único de la migración 1700000000047 la cierra a
      // nivel de base, acá solo se traduce el error crudo al mismo 409.
      if (isUniqueViolation(err)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      throw err;
    }

    return cancellation;
  }
}
