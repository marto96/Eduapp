import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PublishAnnouncementUseCase } from '../../application/use-cases/publish-announcement.use-case';
import { ListAnnouncementsUseCase } from '../../application/use-cases/list-announcements.use-case';
import { PublishAnnouncementDto } from '../dtos/publish-announcement.dto';
import { ListAnnouncementsQueryDto } from '../dtos/list-announcements-query.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly publishAnnouncement: PublishAnnouncementUseCase,
    private readonly listAnnouncements: ListAnnouncementsUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Announcement'))
  async create(@Body() dto: PublishAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.publishAnnouncement.execute({ ...dto, publishedBy: user.sub });
  }

  @Get()
  async list(@Query() query: ListAnnouncementsQueryDto) {
    return this.listAnnouncements.execute(query);
  }
}
