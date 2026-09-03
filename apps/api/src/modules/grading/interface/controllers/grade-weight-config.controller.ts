import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { GetGradeWeightConfigUseCase } from '../../application/use-cases/get-grade-weight-config.use-case';
import { EditGradeWeightConfigUseCase } from '../../application/use-cases/edit-grade-weight-config.use-case';
import { EditGradeWeightConfigDto } from '../dtos/edit-grade-weight-config.dto';

@Controller('grading/weight-config')
export class GradeWeightConfigController {
  constructor(
    private readonly getConfig: GetGradeWeightConfigUseCase,
    private readonly editConfig: EditGradeWeightConfigUseCase,
  ) {}

  @Get()
  async get() {
    return this.getConfig.execute();
  }

  @Patch()
  @CheckPolicies((ability) => ability.can('manage', 'AcademicYear'))
  async edit(@Body() dto: EditGradeWeightConfigDto) {
    return this.editConfig.execute(dto);
  }
}
