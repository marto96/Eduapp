export class Survey {
  constructor(
    public readonly id: string,
    public readonly question: string,
    public readonly options: string[],
    public readonly createdBy: string,
    public readonly createdAt: string,
  ) {
    if (!question.trim()) {
      throw new Error('La pregunta no puede estar vacía');
    }
    const cleanOptions = options.map((o) => o.trim());
    if (cleanOptions.length < 2) {
      throw new Error('La encuesta necesita al menos 2 opciones');
    }
    if (cleanOptions.some((o) => !o)) {
      throw new Error('Las opciones no pueden estar vacías');
    }
    if (new Set(cleanOptions).size !== cleanOptions.length) {
      throw new Error('Las opciones no pueden repetirse');
    }
  }
}
