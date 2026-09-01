import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

@Injectable()
export class LinkAdmissionEnrollmentUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(id: string, enrollmentId: string): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'aceptada') {
      throw new ConflictException('Solo se puede enlazar la matrícula de una solicitud aceptada');
    }
    if (application.resultingEnrollmentId) {
      throw new ConflictException('Esta solicitud ya tiene una matrícula enlazada');
    }
    application.linkEnrollment(enrollmentId);
    await this.applications.save(application);
    return application;
  }
}
