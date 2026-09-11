import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentRequest, DeliveryMethod } from '../../domain/entities/document-request.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateChargeUseCase } from '../../../finance/application/use-cases/create-charge.use-case';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface RequestDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  deliveryMethod: DeliveryMethod;
  note?: string;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Documento',
};

@Injectable()
export class RequestDocumentUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly createCharge: CreateChargeUseCase,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RequestDocumentInput, currentUser: JwtPayload): Promise<DocumentRequest> {
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds !== null && !allowedEnrollmentIds.has(input.enrollmentId)) {
      throw new ForbiddenException('No tenés acceso a esta matrícula');
    }

    const price = await this.prices.findByType(input.type);
    const amount = price?.amount ?? 0;
    const today = new Date().toISOString().slice(0, 10);
    const label = TYPE_LABELS[input.type];

    const request = new DocumentRequest(
      randomUUID(),
      input.enrollmentId,
      input.type,
      input.deliveryMethod,
      input.note ?? null,
      currentUser.sub,
      new Date().toISOString(),
      'pendiente_pago',
    );

    if (amount > 0) {
      const charge = await this.createCharge.execute({
        enrollmentId: input.enrollmentId,
        concept: 'documento',
        description: label,
        amount,
        dueDate: today,
      });
      request.chargeId = charge.id;
    } else {
      const issuedDocument = await this.issueDocument.execute({
        enrollmentId: input.enrollmentId,
        type: input.type,
        description: label,
        issuedAt: today,
        issuedBy: currentUser.sub,
      });
      request.markReady(issuedDocument.id);
    }

    await this.documentRequests.save(request);
    return request;
  }
}
