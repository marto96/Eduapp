import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { SendTemplatedEmailUseCase } from '../../../email/application/use-cases/send-templated-email.use-case';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

@Injectable()
export class RejectAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    private readonly sendEmail: SendTemplatedEmailUseCase,
  ) {}

  async execute(id: string, rejectionReason: string): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se pueden rechazar solicitudes pendientes de entrevista');
    }
    application.reject(rejectionReason);
    await this.applications.save(application);

    await this.sendEmail.execute({
      type: 'solicitud_rechazada',
      to: application.guardianEmail,
      variables: {
        trackingCode: application.trackingCode,
        estudiante: `${application.studentFirstName} ${application.studentLastName}`,
      },
    });

    return application;
  }
}
