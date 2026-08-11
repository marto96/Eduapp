export interface SurveyQuestion {
  id: string;
  text: string;
  options: string[];
}

export class Survey {
  constructor(
    public readonly id: string,
    public readonly questions: SurveyQuestion[],
    public readonly createdBy: string,
    public readonly createdAt: string,
    public closesAt: string | null = null,
    public editedAt: string | null = null,
    public voidedAt: string | null = null,
  ) {
    if (questions.length < 1) {
      throw new Error('La encuesta necesita al menos 1 pregunta');
    }
    const questionIds = questions.map((q) => q.id);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new Error('Las preguntas no pueden repetir id');
    }
    for (const question of questions) {
      if (!question.text.trim()) {
        throw new Error('La pregunta no puede estar vacía');
      }
      const cleanOptions = question.options.map((o) => o.trim());
      if (cleanOptions.length < 2) {
        throw new Error('Cada pregunta necesita al menos 2 opciones');
      }
      if (cleanOptions.some((o) => !o)) {
        throw new Error('Las opciones no pueden estar vacías');
      }
      if (new Set(cleanOptions).size !== cleanOptions.length) {
        throw new Error('Las opciones de una pregunta no pueden repetirse');
      }
    }
  }

  isClosed(now: string = new Date().toISOString()): boolean {
    return this.closesAt !== null && now > this.closesAt;
  }

  reschedule(closesAt: string | null): void {
    this.closesAt = closesAt;
    this.editedAt = new Date().toISOString();
  }

  markVoided(): void {
    this.voidedAt = new Date().toISOString();
  }
}
