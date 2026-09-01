import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { CreateAdmissionApplicationUseCase } from '../../application/use-cases/create-admission-application.use-case';
import { GetAdmissionApplicationStatusUseCase } from '../../application/use-cases/get-admission-application-status.use-case';
import { CreateAdmissionApplicationDto } from '../dtos/create-admission-application.dto';

@Controller('admissions/applications')
@Public()
export class AdmissionPublicController {
  constructor(
    private readonly createApplication: CreateAdmissionApplicationUseCase,
    private readonly getStatus: GetAdmissionApplicationStatusUseCase,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateAdmissionApplicationDto) {
    return this.createApplication.execute(dto);
  }

  @Get('status/:trackingCode')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async status(@Param('trackingCode') trackingCode: string) {
    return this.getStatus.execute(trackingCode);
  }
}
