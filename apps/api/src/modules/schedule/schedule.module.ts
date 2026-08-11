import { Module } from '@nestjs/common';
import { SchedulesController } from './interface/controllers/schedules.controller';
import { CreateScheduleUseCase } from './application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from './application/use-cases/list-schedules.use-case';
import { TeacherSectionsService } from './application/services/teacher-sections.service';
import { ScheduleRepositoryPort } from './application/ports/schedule.repository.port';
import { TypeOrmScheduleRepository } from './infrastructure/repositories/typeorm-schedule.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [SchedulesController],
  providers: [
    CreateScheduleUseCase,
    ListSchedulesUseCase,
    TeacherSectionsService,
    { provide: ScheduleRepositoryPort, useClass: TypeOrmScheduleRepository },
  ],
  exports: [TeacherSectionsService],
})
export class ScheduleModule {}
