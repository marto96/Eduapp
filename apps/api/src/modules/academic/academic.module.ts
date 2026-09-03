import { Module } from '@nestjs/common';
import { AcademicYearsController } from './interface/controllers/academic-years.controller';
import { GradesController } from './interface/controllers/grades.controller';
import { SectionsController } from './interface/controllers/sections.controller';
import { SubjectsController } from './interface/controllers/subjects.controller';
import { PeriodsController } from './interface/controllers/periods.controller';
import { CreateAcademicYearUseCase } from './application/use-cases/create-academic-year.use-case';
import { ListAcademicYearsUseCase } from './application/use-cases/list-academic-years.use-case';
import { GetAcademicYearUseCase } from './application/use-cases/get-academic-year.use-case';
import { CreateGradeUseCase } from './application/use-cases/create-grade.use-case';
import { EditGradeUseCase } from './application/use-cases/edit-grade.use-case';
import { ListGradesUseCase } from './application/use-cases/list-grades.use-case';
import { CreateSectionUseCase } from './application/use-cases/create-section.use-case';
import { ListSectionsUseCase } from './application/use-cases/list-sections.use-case';
import { CreateSubjectUseCase } from './application/use-cases/create-subject.use-case';
import { ListSubjectsUseCase } from './application/use-cases/list-subjects.use-case';
import { CreatePeriodUseCase } from './application/use-cases/create-period.use-case';
import { ListPeriodsUseCase } from './application/use-cases/list-periods.use-case';
import { EditPeriodUseCase } from './application/use-cases/edit-period.use-case';
import { AcademicYearRepositoryPort } from './application/ports/academic-year.repository.port';
import { GradeRepositoryPort } from './application/ports/grade.repository.port';
import { SectionRepositoryPort } from './application/ports/section.repository.port';
import { SubjectRepositoryPort } from './application/ports/subject.repository.port';
import { PeriodRepositoryPort } from './application/ports/period.repository.port';
import { TypeOrmAcademicYearRepository } from './infrastructure/repositories/typeorm-academic-year.repository';
import { TypeOrmGradeRepository } from './infrastructure/repositories/typeorm-grade.repository';
import { TypeOrmSectionRepository } from './infrastructure/repositories/typeorm-section.repository';
import { TypeOrmSubjectRepository } from './infrastructure/repositories/typeorm-subject.repository';
import { TypeOrmPeriodRepository } from './infrastructure/repositories/typeorm-period.repository';

@Module({
  controllers: [AcademicYearsController, GradesController, SectionsController, SubjectsController, PeriodsController],
  providers: [
    CreateAcademicYearUseCase,
    ListAcademicYearsUseCase,
    GetAcademicYearUseCase,
    CreateGradeUseCase,
    EditGradeUseCase,
    ListGradesUseCase,
    CreateSectionUseCase,
    ListSectionsUseCase,
    CreateSubjectUseCase,
    ListSubjectsUseCase,
    CreatePeriodUseCase,
    ListPeriodsUseCase,
    EditPeriodUseCase,
    { provide: AcademicYearRepositoryPort, useClass: TypeOrmAcademicYearRepository },
    { provide: GradeRepositoryPort, useClass: TypeOrmGradeRepository },
    { provide: SectionRepositoryPort, useClass: TypeOrmSectionRepository },
    { provide: SubjectRepositoryPort, useClass: TypeOrmSubjectRepository },
    { provide: PeriodRepositoryPort, useClass: TypeOrmPeriodRepository },
  ],
  exports: [
    SubjectRepositoryPort,
    SectionRepositoryPort,
    AcademicYearRepositoryPort,
    GradeRepositoryPort,
    PeriodRepositoryPort,
  ],
})
export class AcademicModule {}
