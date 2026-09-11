import { forwardRef, Module } from '@nestjs/common';
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
import { FinanceModule } from '../finance/finance.module';
import { ListDocumentTypePricesUseCase } from './application/use-cases/list-document-type-prices.use-case';
import { SetDocumentTypePriceUseCase } from './application/use-cases/set-document-type-price.use-case';
import { DocumentTypePriceRepositoryPort } from './application/ports/document-type-price.repository.port';
import { TypeOrmDocumentTypePriceRepository } from './infrastructure/repositories/typeorm-document-type-price.repository';
import { RequestDocumentUseCase } from './application/use-cases/request-document.use-case';
import { DocumentRequestRepositoryPort } from './application/ports/document-request.repository.port';
import { TypeOrmDocumentRequestRepository } from './infrastructure/repositories/typeorm-document-request.repository';

@Module({
  imports: [EnrollmentModule, IdentityModule, forwardRef(() => FinanceModule)],
  controllers: [DocumentsController],
  providers: [
    IssueDocumentUseCase,
    ListDocumentsUseCase,
    VoidDocumentUseCase,
    GetDocumentPdfUseCase,
    DocumentPdfGenerator,
    { provide: IssuedDocumentRepositoryPort, useClass: TypeOrmIssuedDocumentRepository },
    ListDocumentTypePricesUseCase,
    SetDocumentTypePriceUseCase,
    { provide: DocumentTypePriceRepositoryPort, useClass: TypeOrmDocumentTypePriceRepository },
    RequestDocumentUseCase,
    { provide: DocumentRequestRepositoryPort, useClass: TypeOrmDocumentRequestRepository },
  ],
})
export class DocumentsModule {}
