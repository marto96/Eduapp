import { Inject, Injectable } from '@nestjs/common';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';

@Injectable()
export class TeacherSectionsService {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async getAccessibleSectionIds(teacherId: string): Promise<Set<string>> {
    const entries = await this.schedules.findAll({ teacherId });
    return new Set(entries.map((entry) => entry.sectionId));
  }
}
