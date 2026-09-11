import { Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { UserRole } from '../../../identity/domain/entities/user.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const TYPE_LABELS: Record<DocumentType, string> = {
  constancia_matricula: 'Constancia de matrícula',
  certificado_notas: 'Certificado de notas',
  constancia_buena_conducta: 'Constancia de buena conducta',
  otro: 'Documento',
};

const STAFF_ROLES: UserRole[] = ['admin_institucion', 'directivo', 'secretaria'];

@Injectable()
export class CompleteDocumentPaymentUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    private readonly issueDocument: IssueDocumentUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(chargeId: string): Promise<void> {
    const request = await this.documentRequests.findByChargeId(chargeId);
    if (!request) return;
    if (request.status !== 'pendiente_pago') return;

    const issuedDocument = await this.issueDocument.execute({
      enrollmentId: request.enrollmentId,
      type: request.type,
      description: TYPE_LABELS[request.type],
      issuedAt: new Date().toISOString().slice(0, 10),
      issuedBy: request.requestedBy,
    });

    request.markReady(issuedDocument.id);
    await this.documentRequests.save(request);

    if (request.deliveryMethod === 'fisico') {
      await this.notifyStaff();
    }
  }

  private async notifyStaff(): Promise<void> {
    const recipients = new Map<string, true>();
    for (const role of STAFF_ROLES) {
      const { items } = await this.users.findAll({ role });
      items.forEach((u) => recipients.set(u.id, true));
    }

    await Promise.all(
      Array.from(recipients.keys()).map((recipientUserId) =>
        this.createNotification.execute({
          recipientUserId,
          type: 'document_request_ready_to_print',
          title: 'Documento listo para imprimir',
          body: 'Hay una solicitud de documento pagada, lista para imprimir y entregar.',
          link: '/documents?tab=solicitudes',
        }),
      ),
    );
  }
}
