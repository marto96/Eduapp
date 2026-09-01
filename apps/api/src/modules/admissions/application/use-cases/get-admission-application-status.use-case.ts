import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { GradeRepositoryPort } from '../../../academic/application/ports/grade.repository.port';
import { AdmissionStatus } from '../../domain/entities/admission-application.entity';

export interface AdmissionStatusOutput {
  status: AdmissionStatus;
  gradeName: string;
  createdAt: string;
}

@Injectable()
export class GetAdmissionApplicationStatusUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(GradeRepositoryPort) private readonly grades: GradeRepositoryPort,
  ) {}

  async execute(trackingCode: string): Promise<AdmissionStatusOutput> {
    const application = await this.applications.findByTrackingCode(trackingCode);
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    const grade = await this.grades.findById(application.gradeId);
    return {
      status: application.status,
      gradeName: grade?.name ?? '',
      createdAt: application.createdAt,
    };
  }
}
