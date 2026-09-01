import { Inject, Injectable } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

@Injectable()
export class ListAdmissionApplicationsUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(status: AdmissionStatus | undefined): Promise<AdmissionApplication[]> {
    return this.applications.findAll(status ? { status } : undefined);
  }
}
