export class ClassCancellation {
  constructor(
    public readonly id: string,
    public readonly scheduleId: string,
    public readonly date: string,
    public readonly cancelledBy: string,
    public readonly reason: string | null = null,
  ) {}
}
