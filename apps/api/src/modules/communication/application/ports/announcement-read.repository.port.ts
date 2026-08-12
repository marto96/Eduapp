export interface AnnouncementReadRow {
  announcementId: string;
  userId: string;
  readAt: string;
}

export abstract class AnnouncementReadRepositoryPort {
  abstract markRead(announcementId: string, userId: string): Promise<void>;
  abstract findByAnnouncement(announcementId: string): Promise<AnnouncementReadRow[]>;
}
