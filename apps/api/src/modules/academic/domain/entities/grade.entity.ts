export class Grade {
  constructor(
    public readonly id: string,
    public name: string,
    public level: string,
    /** Secuencia entre grados (ej. Sexto=6, Séptimo=7): permite comparar cuál va después de cuál. */
    public order: number,
  ) {}

  edit(name: string, level: string, order: number): void {
    this.name = name;
    this.level = level;
    this.order = order;
  }
}
