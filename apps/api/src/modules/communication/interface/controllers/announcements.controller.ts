import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PublishAnnouncementUseCase } from '../../application/use-cases/publish-announcement.use-case';
import { ListAnnouncementsUseCase } from '../../application/use-cases/list-announcements.use-case';
import { EditAnnouncementUseCase } from '../../application/use-cases/edit-announcement.use-case';
import { VoidAnnouncementUseCase } from '../../application/use-cases/void-announcement.use-case';
import { MarkAnnouncementReadUseCase } from '../../application/use-cases/mark-announcement-read.use-case';
import { GetAnnouncementReadersUseCase } from '../../application/use-cases/get-announcement-readers.use-case';
import { PublishAnnouncementDto } from '../dtos/publish-announcement.dto';
import { ListAnnouncementsQueryDto } from '../dtos/list-announcements-query.dto';
import { EditAnnouncementDto } from '../dtos/edit-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly publishAnnouncement: PublishAnnouncementUseCase,
    private readonly listAnnouncements: ListAnnouncementsUseCase,
    private readonly editAnnouncement: EditAnnouncementUseCase,
    private readonly voidAnnouncement: VoidAnnouncementUseCase,
    private readonly markAnnouncementRead: MarkAnnouncementReadUseCase,
    private readonly getAnnouncementReaders: GetAnnouncementReadersUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Announcement'))
  async create(@Body() dto: PublishAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.publishAnnouncement.execute({ ...dto, publishedBy: user.sub });
  }

  @Get()
  async list(@Query() query: ListAnnouncementsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listAnnouncements.execute(query, user);
  }

  @Patch(':id/void')
  @CheckPolicies((ability) => ability.can('update', 'Announcement'))
  async annul(@Param('id') id: string) {
    return this.voidAnnouncement.execute(id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Announcement'))
  async edit(@Param('id') id: string, @Body() dto: EditAnnouncementDto) {
    return this.editAnnouncement.execute(id, dto.title, dto.body, dto.sectionId ?? null);
  }

  // Autogestión: cualquier usuario autenticado puede marcar como leído un
  // comunicado (readAt scoped al propio `user.sub`, nunca a otro) — no hace
  // falta policy de admin. El use-case valida que el comunicado sea
  // efectivamente visible para este usuario (institucional o de su propia
  // sección) antes de registrar la lectura, así que no se puede ensuciar
  // el conteo de lectores de comunicados ajenos.
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.markAnnouncementRead.execute(id, user);
    return { ok: true };
  }

  @Get(':id/reads')
  @CheckPolicies((ability) => ability.can('update', 'Announcement'))
  async readers(@Param('id') id: string) {
    return this.getAnnouncementReaders.execute(id);
  }
}
