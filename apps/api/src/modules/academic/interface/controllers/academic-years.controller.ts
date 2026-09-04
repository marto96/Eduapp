import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateAcademicYearUseCase } from '../../application/use-cases/create-academic-year.use-case';
import { ListAcademicYearsUseCase } from '../../application/use-cases/list-academic-years.use-case';
import { GetAcademicYearUseCase } from '../../application/use-cases/get-academic-year.use-case';
import { EditAcademicYearUseCase } from '../../application/use-cases/edit-academic-year.use-case';
import { DeleteAcademicYearUseCase } from '../../application/use-cases/delete-academic-year.use-case';
import { CreateAcademicYearDto } from '../dtos/create-academic-year.dto';
import { EditAcademicYearDto } from '../dtos/edit-academic-year.dto';

@Controller('academic/years')
export class AcademicYearsController {
  constructor(
    private readonly createYear: CreateAcademicYearUseCase,
    private readonly listYears: ListAcademicYearsUseCase,
    private readonly getYear: GetAcademicYearUseCase,
    private readonly editYear: EditAcademicYearUseCase,
    private readonly deleteYear: DeleteAcademicYearUseCase,
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

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async edit(@Param('id') id: string, @Body() dto: EditAcademicYearDto) {
    return this.editYear.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async delete(@Param('id') id: string) {
    await this.deleteYear.execute(id);
  }
}
