import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateAcademicYearUseCase } from '../../application/use-cases/create-academic-year.use-case';
import { ListAcademicYearsUseCase } from '../../application/use-cases/list-academic-years.use-case';
import { GetAcademicYearUseCase } from '../../application/use-cases/get-academic-year.use-case';
import { CreateAcademicYearDto } from '../dtos/create-academic-year.dto';

@Controller('academic/years')
export class AcademicYearsController {
  constructor(
    private readonly createYear: CreateAcademicYearUseCase,
    private readonly listYears: ListAcademicYearsUseCase,
    private readonly getYear: GetAcademicYearUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'AcademicYear'))
  async create(@Body() dto: CreateAcademicYearDto) {
    return this.createYear.execute(dto);
  }

  @Get()
  async list() {
    return this.listYears.execute();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.getYear.execute(id);
  }
}
