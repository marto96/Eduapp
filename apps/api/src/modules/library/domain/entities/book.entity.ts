export class Book {
  constructor(
    public readonly id: string,
    public title: string,
    public author: string,
    public totalCopies: number,
  ) {
    if (!title.trim()) {
      throw new Error('El título no puede estar vacío');
    }
    if (!author.trim()) {
      throw new Error('El autor no puede estar vacío');
    }
    if (totalCopies < 1) {
      throw new Error('Debe haber al menos una copia');
    }
  }
}
