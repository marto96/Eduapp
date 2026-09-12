import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';

export interface VerifyIssuedDocumentOutput {
  type: DocumentType;
  studentName: string;
  institutionName: string;
  issuedAt: string;
  voided: boolean;
}

/**
 * Endpoint público (sin login) detrás del QR que imprime cada PDF — el id
 * (UUID aleatorio) es el único control de acceso, mismo modelo que el
 * tracking code de admisiones. El nombre del estudiante ya está impreso a
 * la vista en el documento físico que quien escanea tiene en la mano; esta
 * respuesta solo confirma que coincide con un documento real emitido por
 * la institución, no expone nada que ese documento no muestre ya.
 */
@Injectable()
export class VerifyIssuedDocumentUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    private readonly tenantRegistry: TenantRegistryService,
  ) {}

  async execute(id: string): Promise<VerifyIssuedDocumentOutput> {
    const document = await this.documents.findById(id);
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const enrollment = await this.enrollments.findById(document.enrollmentId);
    const student = enrollment ? await this.users.findById(enrollment.studentId) : null;
    const { subdomain } = getCurrentTenant();
    const tenant = await this.tenantRegistry.resolveByHost(subdomain);

    return {
      type: document.type,
      studentName: student?.fullName ?? 'Estudiante',
      institutionName: tenant?.name ?? 'Skolaria',
      issuedAt: document.issuedAt,
      voided: document.voidedAt !== null,
    };
  }
}
