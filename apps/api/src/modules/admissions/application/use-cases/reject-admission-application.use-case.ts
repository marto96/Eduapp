import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

@Injectable()
export class RejectAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
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
    return application;
  }
}
