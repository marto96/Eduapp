import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { DocumentType, IssuedDocument } from '../../domain/entities/issued-document.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { DocumentPdfGenerator } from '../../infrastructure/pdf/document-pdf-generator';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';

export interface IssueDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  description: string;
  issuedAt: string;
  issuedBy: string;
}

@Injectable()
export class IssueDocumentUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
    private readonly pdfGenerator: DocumentPdfGenerator,
    private readonly tenantRegistry: TenantRegistryService,
  ) {}

  async execute(input: IssueDocumentInput): Promise<IssuedDocument> {
    const enrollment = await this.enrollments.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${input.enrollmentId}"`);
    }

    const document = new IssuedDocument(
      randomUUID(),
      input.enrollmentId,
      input.type,
      input.description,
      input.issuedAt,
      input.issuedBy,
    );

    // El PDF se genera al vuelo con lo que hay disponible en este momento;
    // si algo falla acá (estudiante o tenant no resuelto), el registro de
    // emisión igual queda guardado — `pdfGeneratedAt` simplemente no se
    // setea y el documento queda sin PDF descargable, no se pierde el alta.
    try {
      const student = await this.users.findById(enrollment.studentId);
      const { subdomain } = getCurrentTenant();
      const tenant = await this.tenantRegistry.resolveByHost(subdomain);

      const pdfBuffer = await this.pdfGenerator.generate({
        type: input.type,
        description: input.description,
        issuedAt: input.issuedAt,
        studentName: student?.fullName ?? enrollment.studentId,
        institutionName: tenant?.name ?? 'Skolaria',
      });

      await this.storage.save(
        'documents',
        `${document.id}.pdf`,
        { buffer: pdfBuffer, originalname: `${document.id}.pdf`, mimetype: 'application/pdf' },
        'private',
      );
      document.pdfGeneratedAt = new Date().toISOString();
    } catch {
      // no-op: ver comentario arriba.
    }

    await this.documents.save(document);
    return document;
  }
}
