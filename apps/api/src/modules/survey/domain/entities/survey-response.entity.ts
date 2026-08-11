export interface SurveyAnswer {
  questionId: string;
  selectedOption: string;
}

export class SurveyResponse {
  constructor(
    public readonly id: string,
    public readonly surveyId: string,
    public readonly respondentId: string,
    public readonly answers: SurveyAnswer[],
    public readonly respondedAt: string,
  ) {
    if (answers.length < 1) {
      throw new Error('Debe responderse al menos una pregunta');
    }
    const questionIds = answers.map((a) => a.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new Error('No se puede responder la misma pregunta dos veces');
    }
    if (answers.some((a) => !a.selectedOption.trim())) {
      throw new Error('Debe seleccionarse una opción para cada pregunta');
    }
  }
}
