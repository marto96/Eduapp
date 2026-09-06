import { Body, Controller, Param, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { DistributeGradeIntoSectionsUseCase } from '../../application/use-cases/distribute-grade-into-sections.use-case';
import { DistributeSectionsDto } from '../dtos/distribute-sections.dto';

@Controller('enrollment/grades')
export class SectionDistributionController {
  constructor(private readonly distribute: DistributeGradeIntoSectionsUseCase) {}

  @Post(':gradeId/distribute-sections')
  @CheckPolicies((ability) => ability.can('update', 'Enrollment'))
  async distributeSections(@Param('gradeId') gradeId: string, @Body() dto: DistributeSectionsDto) {
    return this.distribute.execute({
      gradeId,
      academicYearId: dto.academicYearId,
      sectionIds: dto.sectionIds,
    });
  }
}
