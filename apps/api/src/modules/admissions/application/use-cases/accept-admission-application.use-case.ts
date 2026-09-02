import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';

export interface AcceptAdmissionApplicationOutput {
  application: AdmissionApplication;
  matchedUserId: string | null;
  prefill: {
    firstName: string;
    lastName: string;
    birthDate: string;
    documentType: DocumentType;
    documentNumber: string;
    address: string;
    gradeId: string;
    academicYearId: string;
  };
}

@Injectable()
export class AcceptAdmissionApplicationUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<AcceptAdmissionApplicationOutput> {
    const application = await this.applications.findById(id);
    if (!application) {
      throw new NotFoundException(`No existe la solicitud "${id}"`);
    }
    if (application.status !== 'pendiente_entrevista') {
      throw new ConflictException('Solo se pueden aceptar solicitudes pendientes de entrevista');
    }

    const matchedUser = await this.users.findByDocumentNumber(application.studentDocumentNumber);
    const matchedStudentId = matchedUser?.hasRole('estudiante') ? matchedUser.id : null;
    application.accept(matchedStudentId);
    await this.applications.save(application);

    return {
      application,
      matchedUserId: matchedStudentId,
      prefill: {
        firstName: application.studentFirstName,
        lastName: application.studentLastName,
        birthDate: application.studentBirthDate,
        documentType: application.studentDocumentType,
        documentNumber: application.studentDocumentNumber,
        address: application.studentAddress,
        gradeId: application.gradeId,
        academicYearId: application.academicYearId,
      },
    };
  }
}
