import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';

export interface RecordAdmissionInterviewInput {
  interviewDate: string;
  interviewNotes: string | null;
}

@Injectable()
export class RecordAdmissionInterviewUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(id: string, input: RecordAdmissionInterviewInput): Promise<AdmissionApplication> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se puede registrar entrevista en solicitudes pendientes de entrevista');
    }
    application.recordInterview(input.interviewDate, input.interviewNotes);
    await this.applications.save(application);
    return application;
  }
}
