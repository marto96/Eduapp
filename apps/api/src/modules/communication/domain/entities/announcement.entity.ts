export type AnnouncementCategory = 'comunicado' | 'circular' | 'aviso';

export class Announcement {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly body: string,
    public readonly category: AnnouncementCategory,
    public readonly publishedAt: string,
    public readonly publishedBy: string,
  ) {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!body.trim()) {
      throw new Error('El cuerpo no puede estar vacío');
    }
  }
}
