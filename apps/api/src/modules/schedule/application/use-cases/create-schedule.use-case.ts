import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { DayOfWeek, Schedule } from '../../domain/entities/schedule.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';

export interface CreateScheduleInput {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

@Injectable()
export class CreateScheduleUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: CreateScheduleInput): Promise<Schedule> {
    const teacher = await this.users.findById(input.teacherId);
    if (!teacher) {
      throw new NotFoundException(`No existe el usuario "${input.teacherId}"`);
    }
    if (!teacher.hasRole('docente')) {
      throw new BadRequestException('El usuario no tiene rol "docente"');
    }

    let schedule: Schedule;
    try {
      schedule = new Schedule(
        randomUUID(),
        input.sectionId,
        input.subjectId,
        input.teacherId,
        input.academicYearId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const teacherSameDay = await this.schedules.findAll({
      teacherId: input.teacherId,
      dayOfWeek: input.dayOfWeek,
    });
    if (teacherSameDay.some((existing) => existing.overlaps(schedule))) {
      throw new ConflictException('El docente ya tiene otro horario asignado en ese rango');
    }

    const sectionSameDay = await this.schedules.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
      dayOfWeek: input.dayOfWeek,
    });
    if (sectionSameDay.some((existing) => existing.overlaps(schedule))) {
      throw new ConflictException('La sección ya tiene otra asignatura asignada en ese rango');
    }

    await this.schedules.save(schedule);
    return schedule;
  }
}
