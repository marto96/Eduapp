export class Section {
  constructor(
    public readonly id: string,
    public readonly gradeId: string,
    public name: string,
  ) {}

  edit(name: string): void {
    this.name = name;
  }
}
