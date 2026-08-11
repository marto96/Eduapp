import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { LinkGuardianUseCase } from '../../application/use-cases/link-guardian.use-case';
import { ListGuardianLinksUseCase } from '../../application/use-cases/list-guardian-links.use-case';
import { LinkGuardianDto } from '../dtos/link-guardian.dto';
import { ListGuardiansQueryDto } from '../dtos/list-guardians-query.dto';

@Controller('guardians')
export class GuardiansController {
  constructor(
    private readonly linkGuardian: LinkGuardianUseCase,
    private readonly listGuardianLinks: ListGuardianLinksUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async create(@Body() dto: LinkGuardianDto) {
    return this.linkGuardian.execute(dto);
  }

  @Get()
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async list(@Query() query: ListGuardiansQueryDto) {
    return this.listGuardianLinks.execute(query);
  }
}
