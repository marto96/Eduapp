import { Module } from '@nestjs/common';
import { AcademicYearsController } from './interface/controllers/academic-years.controller';
import { GradesController } from './interface/controllers/grades.controller';
import { SectionsController } from './interface/controllers/sections.controller';
import { CreateAcademicYearUseCase } from './application/use-cases/create-academic-year.use-case';
import { ListAcademicYearsUseCase } from './application/use-cases/list-academic-years.use-case';
import { GetAcademicYearUseCase } from './application/use-cases/get-academic-year.use-case';
import { CreateGradeUseCase } from './application/use-cases/create-grade.use-case';
import { ListGradesUseCase } from './application/use-cases/list-grades.use-case';
import { CreateSectionUseCase } from './application/use-cases/create-section.use-case';
import { ListSectionsUseCase } from './application/use-cases/list-sections.use-case';
import { AcademicYearRepositoryPort } from './application/ports/academic-year.repository.port';
import { GradeRepositoryPort } from './application/ports/grade.repository.port';
import { SectionRepositoryPort } from './application/ports/section.repository.port';
import { TypeOrmAcademicYearRepository } from './infrastructure/repositories/typeorm-academic-year.repository';
import { TypeOrmGradeRepository } from './infrastructure/repositories/typeorm-grade.repository';
import { TypeOrmSectionRepository } from './infrastructure/repositories/typeorm-section.repository';

@Module({
  controllers: [AcademicYearsController, GradesController, SectionsController],
  providers: [
    CreateAcademicYearUseCase,
    ListAcademicYearsUseCase,
    GetAcademicYearUseCase,
    CreateGradeUseCase,
    ListGradesUseCase,
    CreateSectionUseCase,
    ListSectionsUseCase,
    { provide: AcademicYearRepositoryPort, useClass: TypeOrmAcademicYearRepository },
    { provide: GradeRepositoryPort, useClass: TypeOrmGradeRepository },
    { provide: SectionRepositoryPort, useClass: TypeOrmSectionRepository },
  ],
})
export class AcademicModule {}
