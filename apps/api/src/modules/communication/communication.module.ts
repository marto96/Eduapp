import { Module } from '@nestjs/common';
import { AnnouncementsController } from './interface/controllers/announcements.controller';
import { PublishAnnouncementUseCase } from './application/use-cases/publish-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { AnnouncementRepositoryPort } from './application/ports/announcement.repository.port';
import { TypeOrmAnnouncementRepository } from './infrastructure/repositories/typeorm-announcement.repository';

@Module({
  controllers: [AnnouncementsController],
  providers: [
    PublishAnnouncementUseCase,
    ListAnnouncementsUseCase,
    { provide: AnnouncementRepositoryPort, useClass: TypeOrmAnnouncementRepository },
  ],
})
export class CommunicationModule {}
