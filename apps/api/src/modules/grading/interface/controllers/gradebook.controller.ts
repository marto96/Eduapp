import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { ListGradebookStudentsUseCase } from '../../application/use-cases/list-gradebook-students.use-case';
import { GetGradebookUseCase } from '../../application/use-cases/get-gradebook.use-case';
import { GetSubjectPeriodDetailUseCase } from '../../application/use-cases/get-subject-period-detail.use-case';
import { CreateGradeUseCase } from '../../application/use-cases/create-grade.use-case';
import { RecordGradeRecoveryUseCase } from '../../application/use-cases/record-grade-recovery.use-case';
import { ListGradebookStudentsQueryDto } from '../dtos/list-gradebook-students-query.dto';
import { GetSubjectPeriodDetailQueryDto } from '../dtos/get-subject-period-detail-query.dto';
import { CreateGradeDto } from '../dtos/create-grade.dto';
import { RecordGradeRecoveryDto } from '../dtos/record-grade-recovery.dto';

@Controller('grading/gradebook')
export class GradebookController {
  constructor(
    private readonly listStudents: ListGradebookStudentsUseCase,
    private readonly getGradebook: GetGradebookUseCase,
    private readonly getSubjectPeriodDetail: GetSubjectPeriodDetailUseCase,
    private readonly createGrade: CreateGradeUseCase,
    private readonly recordGradeRecovery: RecordGradeRecoveryUseCase,
  ) {}

  @Get('students')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async searchStudents(@Query() query: ListGradebookStudentsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listStudents.execute(query, user);
  }

  @Get(':enrollmentId')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async get(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: JwtPayload) {
    return this.getGradebook.execute(enrollmentId, user);
  }

  @Get(':enrollmentId/subject-period')
  @CheckPolicies((ability) => ability.can('read', 'Grading'))
  async getSubjectPeriod(
    @Param('enrollmentId') enrollmentId: string,
    @Query() query: GetSubjectPeriodDetailQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getSubjectPeriodDetail.execute(enrollmentId, query.subjectId, query.periodId, user);
  }

  @Post(':enrollmentId/grades')
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async create(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: CreateGradeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createGrade.execute(enrollmentId, dto, user);
  }

  @Post(':enrollmentId/recovery')
  @CheckPolicies((ability) => ability.can('create', 'Grading'))
  async recordRecovery(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: RecordGradeRecoveryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordGradeRecovery.execute(
      { enrollmentId, subjectId: dto.subjectId, periodId: dto.periodId, score: dto.score },
      user,
    );
  }
}
