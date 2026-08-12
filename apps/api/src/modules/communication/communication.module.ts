import { Module } from '@nestjs/common';
import { AnnouncementsController } from './interface/controllers/announcements.controller';
import { EventsController } from './interface/controllers/events.controller';
import { IcsController } from './interface/controllers/ics.controller';
import { MessagesController } from './interface/controllers/messages.controller';
import { PublishAnnouncementUseCase } from './application/use-cases/publish-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { EditAnnouncementUseCase } from './application/use-cases/edit-announcement.use-case';
import { VoidAnnouncementUseCase } from './application/use-cases/void-announcement.use-case';
import { MarkAnnouncementReadUseCase } from './application/use-cases/mark-announcement-read.use-case';
import { GetAnnouncementReadersUseCase } from './application/use-cases/get-announcement-readers.use-case';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { EditEventUseCase } from './application/use-cases/edit-event.use-case';
import { VoidEventUseCase } from './application/use-cases/void-event.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { ListMessagesUseCase } from './application/use-cases/list-messages.use-case';
import { MarkMessageReadUseCase } from './application/use-cases/mark-message-read.use-case';
import { EditMessageUseCase } from './application/use-cases/edit-message.use-case';
import { DeleteMessageUseCase } from './application/use-cases/delete-message.use-case';
import { CountUnreadMessagesUseCase } from './application/use-cases/count-unread-messages.use-case';
import { AddMessageAttachmentUseCase } from './application/use-cases/add-message-attachment.use-case';
import { GetMessageAttachmentUseCase } from './application/use-cases/get-message-attachment.use-case';
import { MessagingPolicyService } from './application/services/messaging-policy.service';
import { AudienceAccessService } from './application/services/audience-access.service';
import { AnnouncementRepositoryPort } from './application/ports/announcement.repository.port';
import { AnnouncementReadRepositoryPort } from './application/ports/announcement-read.repository.port';
import { TypeOrmAnnouncementRepository } from './infrastructure/repositories/typeorm-announcement.repository';
import { TypeOrmAnnouncementReadRepository } from './infrastructure/repositories/typeorm-announcement-read.repository';
import { EventRepositoryPort } from './application/ports/event.repository.port';
import { TypeOrmEventRepository } from './infrastructure/repositories/typeorm-event.repository';
import { MessageRepositoryPort } from './application/ports/message.repository.port';
import { TypeOrmMessageRepository } from './infrastructure/repositories/typeorm-message.repository';
import { IdentityModule } from '../identity/identity.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [IdentityModule, ScheduleModule, EnrollmentModule],
  controllers: [AnnouncementsController, EventsController, IcsController, MessagesController],
  providers: [
    PublishAnnouncementUseCase,
    ListAnnouncementsUseCase,
    EditAnnouncementUseCase,
    VoidAnnouncementUseCase,
    MarkAnnouncementReadUseCase,
    GetAnnouncementReadersUseCase,
    { provide: AnnouncementRepositoryPort, useClass: TypeOrmAnnouncementRepository },
    { provide: AnnouncementReadRepositoryPort, useClass: TypeOrmAnnouncementReadRepository },
    CreateEventUseCase,
    ListEventsUseCase,
    EditEventUseCase,
    VoidEventUseCase,
    { provide: EventRepositoryPort, useClass: TypeOrmEventRepository },
    SendMessageUseCase,
    ListMessagesUseCase,
    MarkMessageReadUseCase,
    EditMessageUseCase,
    DeleteMessageUseCase,
    CountUnreadMessagesUseCase,
    AddMessageAttachmentUseCase,
    GetMessageAttachmentUseCase,
    MessagingPolicyService,
    AudienceAccessService,
    { provide: MessageRepositoryPort, useClass: TypeOrmMessageRepository },
  ],
})
export class CommunicationModule {}
