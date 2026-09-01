import { Module } from '@nestjs/common';
import { SchedulesController } from './interface/controllers/schedules.controller';
import { CreateScheduleUseCase } from './application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from './application/use-cases/list-schedules.use-case';
import { SetScheduleVirtualUseCase } from './application/use-cases/set-schedule-virtual.use-case';
import { GetVirtualRoomUseCase } from './application/use-cases/get-virtual-room.use-case';
import { CancelClassSessionUseCase } from './application/use-cases/cancel-class-session.use-case';
import { UncancelClassSessionUseCase } from './application/use-cases/uncancel-class-session.use-case';
import { ListClassCancellationsUseCase } from './application/use-cases/list-class-cancellations.use-case';
import { TeacherSectionsService } from './application/services/teacher-sections.service';
import { ScheduleRepositoryPort } from './application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from './application/ports/class-cancellation.repository.port';
import { TypeOrmScheduleRepository } from './infrastructure/repositories/typeorm-schedule.repository';
import { TypeOrmClassCancellationRepository } from './infrastructure/repositories/typeorm-class-cancellation.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [SchedulesController],
  providers: [
    CreateScheduleUseCase,
    ListSchedulesUseCase,
    SetScheduleVirtualUseCase,
    GetVirtualRoomUseCase,
    CancelClassSessionUseCase,
    UncancelClassSessionUseCase,
    ListClassCancellationsUseCase,
    TeacherSectionsService,
    { provide: ScheduleRepositoryPort, useClass: TypeOrmScheduleRepository },
    { provide: ClassCancellationRepositoryPort, useClass: TypeOrmClassCancellationRepository },
  ],
  exports: [TeacherSectionsService],
})
export class ScheduleModule {}
