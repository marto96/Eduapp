export type AnnouncementCategory = 'comunicado' | 'circular' | 'aviso';

export class Announcement {
  constructor(
    public readonly id: string,
    public title: string,
    public body: string,
    public readonly category: AnnouncementCategory,
    public readonly publishedAt: string,
    public readonly publishedBy: string,
    public sectionId: string | null = null,
    public editedAt: string | null = null,
    public voidedAt: string | null = null,
  ) {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!body.trim()) {
      throw new Error('El cuerpo no puede estar vacío');
    }
  }

  edit(title: string, body: string, sectionId: string | null): void {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!body.trim()) {
      throw new Error('El cuerpo no puede estar vacío');
    }
    this.title = title;
    this.body = body;
    this.sectionId = sectionId;
    this.editedAt = new Date().toISOString();
  }

  markVoided(): void {
    this.voidedAt = new Date().toISOString();
  }
}
