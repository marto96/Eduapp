import { Module } from '@nestjs/common';
import { DocumentsController } from './interface/controllers/documents.controller';
import { IssueDocumentUseCase } from './application/use-cases/issue-document.use-case';
import { ListDocumentsUseCase } from './application/use-cases/list-documents.use-case';
import { IssuedDocumentRepositoryPort } from './application/ports/issued-document.repository.port';
import { TypeOrmIssuedDocumentRepository } from './infrastructure/repositories/typeorm-issued-document.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [DocumentsController],
  providers: [
    IssueDocumentUseCase,
    ListDocumentsUseCase,
    { provide: IssuedDocumentRepositoryPort, useClass: TypeOrmIssuedDocumentRepository },
  ],
})
export class DocumentsModule {}
