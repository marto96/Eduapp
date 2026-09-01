import { DayOfWeek, Schedule } from '../../domain/entities/schedule.entity';

export interface ScheduleFilter {
  sectionId?: string;
  teacherId?: string;
  academicYearId?: string;
  dayOfWeek?: DayOfWeek;
}

export abstract class ScheduleRepositoryPort {
  abstract findAll(filter?: ScheduleFilter): Promise<Schedule[]>;
  abstract findById(id: string): Promise<Schedule | null>;
  abstract save(schedule: Schedule): Promise<void>;
}
