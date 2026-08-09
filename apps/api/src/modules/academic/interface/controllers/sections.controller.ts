import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateSectionUseCase } from '../../application/use-cases/create-section.use-case';
import { ListSectionsUseCase } from '../../application/use-cases/list-sections.use-case';
import { CreateSectionDto } from '../dtos/create-section.dto';

@Controller('academic/sections')
export class SectionsController {
  constructor(
    private readonly createSection: CreateSectionUseCase,
    private readonly listSections: ListSectionsUseCase,
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
}
