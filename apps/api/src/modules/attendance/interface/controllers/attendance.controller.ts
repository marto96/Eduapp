import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { RecordAttendanceUseCase } from '../../application/use-cases/record-attendance.use-case';
import { ListAttendanceUseCase } from '../../application/use-cases/list-attendance.use-case';
import { RecordAttendanceDto } from '../dtos/record-attendance.dto';
import { ListAttendanceQueryDto } from '../dtos/list-attendance-query.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly recordAttendance: RecordAttendanceUseCase,
    private readonly listAttendance: ListAttendanceUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Attendance'))
  async create(@Body() dto: RecordAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.recordAttendance.execute(dto, user);
  }

  @Get()
  async list(@Query() query: ListAttendanceQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listAttendance.execute(query, user);
  }
}
