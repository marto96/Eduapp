import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { CreateSurveyUseCase } from '../../application/use-cases/create-survey.use-case';
import { ListSurveysUseCase } from '../../application/use-cases/list-surveys.use-case';
import { SubmitSurveyResponseUseCase } from '../../application/use-cases/submit-survey-response.use-case';
import { GetSurveyResultsUseCase } from '../../application/use-cases/get-survey-results.use-case';
import { RescheduleSurveyUseCase } from '../../application/use-cases/reschedule-survey.use-case';
import { VoidSurveyUseCase } from '../../application/use-cases/void-survey.use-case';
import { CreateSurveyDto } from '../dtos/create-survey.dto';
import { SubmitSurveyResponseDto } from '../dtos/submit-survey-response.dto';
import { RescheduleSurveyDto } from '../dtos/reschedule-survey.dto';

@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly createSurvey: CreateSurveyUseCase,
    private readonly listSurveys: ListSurveysUseCase,
    private readonly submitSurveyResponse: SubmitSurveyResponseUseCase,
    private readonly getSurveyResults: GetSurveyResultsUseCase,
    private readonly rescheduleSurvey: RescheduleSurveyUseCase,
    private readonly voidSurvey: VoidSurveyUseCase,
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
      answers: dto.answers,
      respondentId: user.sub,
    });
  }

  @Get(':id/results')
  async results(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.getSurveyResults.execute(id, user);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Survey'))
  async annul(@Param('id') id: string) {
    return this.voidSurvey.execute(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Survey'))
  async reschedule(@Param('id') id: string, @Body() dto: RescheduleSurveyDto) {
    return this.rescheduleSurvey.execute(id, dto.closesAt ?? null);
  }
}
