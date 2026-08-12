import { Inject, Injectable } from '@nestjs/common';
import { AnnouncementReadRepositoryPort } from '../ports/announcement-read.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';

export interface AnnouncementReader {
  userId: string;
  fullName: string;
  readAt: string;
}

@Injectable()
export class GetAnnouncementReadersUseCase {
  constructor(
    @Inject(AnnouncementReadRepositoryPort) private readonly reads: AnnouncementReadRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(announcementId: string): Promise<AnnouncementReader[]> {
    const rows = await this.reads.findByAnnouncement(announcementId);
    const readers = await Promise.all(
      rows.map(async (row) => {
        const user = await this.users.findById(row.userId);
        return { userId: row.userId, fullName: user?.fullName ?? row.userId, readAt: row.readAt };
      }),
    );
    return readers.sort((a, b) => a.readAt.localeCompare(b.readAt));
  }
}
