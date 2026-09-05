import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateSectionUseCase } from '../../application/use-cases/create-section.use-case';
import { ListSectionsUseCase } from '../../application/use-cases/list-sections.use-case';
import { EditSectionUseCase } from '../../application/use-cases/edit-section.use-case';
import { DeleteSectionUseCase } from '../../application/use-cases/delete-section.use-case';
import { CreateSectionDto } from '../dtos/create-section.dto';
import { EditSectionDto } from '../dtos/edit-section.dto';

@Controller('academic/sections')
export class SectionsController {
  constructor(
    private readonly createSection: CreateSectionUseCase,
    private readonly listSections: ListSectionsUseCase,
    private readonly editSection: EditSectionUseCase,
    private readonly deleteSection: DeleteSectionUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Section'))
  async create(@Body() dto: CreateSectionDto) {
    return this.createSection.execute(dto);
  }

  @Get()
  async list() {
    return this.listSections.execute();
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('manage', 'Section'))
  async edit(@Param('id') id: string, @Body() dto: EditSectionDto) {
    return this.editSection.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPolicies((ability) => ability.can('manage', 'Section'))
  async delete(@Param('id') id: string) {
    await this.deleteSection.execute(id);
  }
}
