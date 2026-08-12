import { Module } from '@nestjs/common';
import { DocumentsController } from './interface/controllers/documents.controller';
import { IssueDocumentUseCase } from './application/use-cases/issue-document.use-case';
import { ListDocumentsUseCase } from './application/use-cases/list-documents.use-case';
import { VoidDocumentUseCase } from './application/use-cases/void-document.use-case';
import { GetDocumentPdfUseCase } from './application/use-cases/get-document-pdf.use-case';
import { IssuedDocumentRepositoryPort } from './application/ports/issued-document.repository.port';
import { TypeOrmIssuedDocumentRepository } from './infrastructure/repositories/typeorm-issued-document.repository';
import { DocumentPdfGenerator } from './infrastructure/pdf/document-pdf-generator';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [EnrollmentModule, IdentityModule],
  controllers: [DocumentsController],
  providers: [
    IssueDocumentUseCase,
    ListDocumentsUseCase,
    VoidDocumentUseCase,
    GetDocumentPdfUseCase,
    DocumentPdfGenerator,
    { provide: IssuedDocumentRepositoryPort, useClass: TypeOrmIssuedDocumentRepository },
  ],
})
export class DocumentsModule {}
