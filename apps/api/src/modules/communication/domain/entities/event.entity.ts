export class Event {
  constructor(
    public readonly id: string,
    public title: string,
    public description: string,
    public startsAt: string,
    public endsAt: string | null,
    public readonly createdBy: string,
    public sectionId: string | null = null,
    public editedAt: string | null = null,
    public voidedAt: string | null = null,
  ) {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!description.trim()) {
      throw new Error('La descripción no puede estar vacía');
    }
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }
  }

  edit(
    title: string,
    description: string,
    startsAt: string,
    endsAt: string | null,
    sectionId: string | null,
  ): void {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!description.trim()) {
      throw new Error('La descripción no puede estar vacía');
    }
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }
    this.title = title;
    this.description = description;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.sectionId = sectionId;
    this.editedAt = new Date().toISOString();
  }

  markVoided(): void {
    this.voidedAt = new Date().toISOString();
  }
}
