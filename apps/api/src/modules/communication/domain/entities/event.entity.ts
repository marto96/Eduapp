export class Event {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly startsAt: string,
    public readonly endsAt: string | null,
    public readonly createdBy: string,
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
}
