import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateSurveyUseCase } from '../../application/use-cases/create-survey.use-case';
import { ListSurveysUseCase } from '../../application/use-cases/list-surveys.use-case';
import { SubmitSurveyResponseUseCase } from '../../application/use-cases/submit-survey-response.use-case';
import { GetSurveyResultsUseCase } from '../../application/use-cases/get-survey-results.use-case';
import { CreateSurveyDto } from '../dtos/create-survey.dto';
import { SubmitSurveyResponseDto } from '../dtos/submit-survey-response.dto';

@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly createSurvey: CreateSurveyUseCase,
    private readonly listSurveys: ListSurveysUseCase,
    private readonly submitSurveyResponse: SubmitSurveyResponseUseCase,
    private readonly getSurveyResults: GetSurveyResultsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Survey'))
  async create(@Body() dto: CreateSurveyDto, @CurrentUser() user: JwtPayload) {
    return this.createSurvey.execute({ ...dto, createdBy: user.sub });
  }

  @Get()
  async list() {
    return this.listSurveys.execute();
  }

  @Post(':id/responses')
  @CheckPolicies((ability) => ability.can('create', 'SurveyResponse'))
  async respond(
    @Param('id') id: string,
    @Body() dto: SubmitSurveyResponseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.submitSurveyResponse.execute({
      surveyId: id,
      selectedOption: dto.selectedOption,
      respondentId: user.sub,
    });
  }

  @Get(':id/results')
  async results(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.getSurveyResults.execute(id, user);
  }
}
