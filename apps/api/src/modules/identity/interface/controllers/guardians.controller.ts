import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { LinkGuardianUseCase } from '../../application/use-cases/link-guardian.use-case';
import { ListGuardianLinksUseCase } from '../../application/use-cases/list-guardian-links.use-case';
import { RequestGuardianLinkUseCase } from '../../application/use-cases/request-guardian-link.use-case';
import { ApproveGuardianLinkUseCase } from '../../application/use-cases/approve-guardian-link.use-case';
import { LinkGuardianDto } from '../dtos/link-guardian.dto';
import { ListGuardiansQueryDto } from '../dtos/list-guardians-query.dto';
import { RequestGuardianLinkDto } from '../dtos/request-guardian-link.dto';

@Controller('guardians')
export class GuardiansController {
  constructor(
    private readonly linkGuardian: LinkGuardianUseCase,
    private readonly listGuardianLinks: ListGuardianLinksUseCase,
    private readonly requestGuardianLink: RequestGuardianLinkUseCase,
    private readonly approveGuardianLink: ApproveGuardianLinkUseCase,
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

  // Autogestión: cualquier usuario autenticado puede ver SUS PROPIOS
  // vínculos (guardianUserId forzado desde el JWT, no del query) — a
  // diferencia de GET /guardians (arriba), no expone vínculos ajenos, así
  // que no hace falta el policy de admin/directivo.
  @Get('mine')
  async mine(@CurrentUser() user: JwtPayload) {
    return this.listGuardianLinks.execute({ guardianUserId: user.sub });
  }

  // Autogestión: un padre_tutor solicita el vínculo con su propio usuario
  // como guardianUserId (nunca del body — evita pedir en nombre de otro),
  // queda 'pending' hasta que admin/directivo lo apruebe.
  @Post('requests')
  @CheckPolicies((ability) => ability.can('create', 'GuardianLink'))
  async request(@Body() dto: RequestGuardianLinkDto, @CurrentUser() user: JwtPayload) {
    return this.requestGuardianLink.execute({ guardianUserId: user.sub, studentUserId: dto.studentUserId });
  }

  @Patch(':id/approve')
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  async approve(@Param('id') id: string) {
    return this.approveGuardianLink.execute(id);
  }
}
