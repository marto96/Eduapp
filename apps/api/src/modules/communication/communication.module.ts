import { Module } from '@nestjs/common';
import { AnnouncementsController } from './interface/controllers/announcements.controller';
import { EventsController } from './interface/controllers/events.controller';
import { MessagesController } from './interface/controllers/messages.controller';
import { PublishAnnouncementUseCase } from './application/use-cases/publish-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { ListMessagesUseCase } from './application/use-cases/list-messages.use-case';
import { MarkMessageReadUseCase } from './application/use-cases/mark-message-read.use-case';
import { EditMessageUseCase } from './application/use-cases/edit-message.use-case';
import { AnnouncementRepositoryPort } from './application/ports/announcement.repository.port';
import { TypeOrmAnnouncementRepository } from './infrastructure/repositories/typeorm-announcement.repository';
import { EventRepositoryPort } from './application/ports/event.repository.port';
import { TypeOrmEventRepository } from './infrastructure/repositories/typeorm-event.repository';
import { MessageRepositoryPort } from './application/ports/message.repository.port';
import { TypeOrmMessageRepository } from './infrastructure/repositories/typeorm-message.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [AnnouncementsController, EventsController, MessagesController],
  providers: [
    PublishAnnouncementUseCase,
    ListAnnouncementsUseCase,
    { provide: AnnouncementRepositoryPort, useClass: TypeOrmAnnouncementRepository },
    CreateEventUseCase,
    ListEventsUseCase,
    { provide: EventRepositoryPort, useClass: TypeOrmEventRepository },
    SendMessageUseCase,
    ListMessagesUseCase,
    MarkMessageReadUseCase,
    EditMessageUseCase,
    { provide: MessageRepositoryPort, useClass: TypeOrmMessageRepository },
  ],
})
export class CommunicationModule {}
