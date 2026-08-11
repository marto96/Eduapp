export class Loan {
  constructor(
    public readonly id: string,
    public readonly bookId: string,
    public readonly studentId: string,
    public readonly borrowedAt: string,
    public readonly dueDate: string,
    public returnedAt: string | null = null,
  ) {}

  returnBook(): void {
    this.returnedAt = new Date().toISOString();
  }
}
