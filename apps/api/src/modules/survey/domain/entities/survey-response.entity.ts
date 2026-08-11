export class SurveyResponse {
  constructor(
    public readonly id: string,
    public readonly surveyId: string,
    public readonly respondentId: string,
    public readonly selectedOption: string,
    public readonly respondedAt: string,
  ) {
    if (!selectedOption.trim()) {
      throw new Error('Debe seleccionarse una opción');
    }
  }
}
