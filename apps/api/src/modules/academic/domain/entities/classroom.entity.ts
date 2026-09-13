export class Classroom {
  constructor(
    public readonly id: string,
    public name: string,
    public capacity: number,
  ) {
    if (capacity <= 0) {
      throw new Error('La capacidad debe ser mayor a cero');
    }
  }
}
