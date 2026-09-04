import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AdmissionApplicationFilter,
  AdmissionApplicationRepositoryPort,
  PaginatedAdmissionApplications,
  PaginationParams,
} from '../../application/ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { DocumentType } from '../../../identity/domain/entities/user.entity';
import { AdmissionApplicationOrmEntity } from '../entities/admission-application.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

const PENDING_STATUSES: AdmissionStatus[] = ['pendiente_pago', 'pendiente_entrevista'];

@Injectable()
export class TypeOrmAdmissionApplicationRepository extends AdmissionApplicationRepositoryPort {
  private readonly repo: Repository<AdmissionApplicationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionApplicationOrmEntity);
  }

  async findById(id: string): Promise<AdmissionApplication | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTrackingCode(trackingCode: string): Promise<AdmissionApplication | null> {
    const row = await this.repo.findOne({ where: { trackingCode } });
    return row ? this.toDomain(row) : null;
  }

  async findPendingByDocumentNumber(documentNumber: string): Promise<AdmissionApplication | null> {
    const row = await this.repo
      .createQueryBuilder('a')
      .where('a.student_document_number = :documentNumber', { documentNumber })
      .andWhere('a.status IN (:...statuses)', { statuses: PENDING_STATUSES })
      .getOne();
    return row ? this.toDomain(row) : null;
  }

  async findAll(
    filter: AdmissionApplicationFilter | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedAdmissionApplications> {
    const query = this.repo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');
    if (filter?.status) {
      query.andWhere('a.status = :status', { status: filter.status });
    }
    if (filter?.search) {
      query.andWhere(
        '(a.tracking_code ILIKE :term OR a.student_first_name ILIKE :term OR a.student_last_name ILIKE :term)',
        { term: `%${filter.search}%` },
      );
    }

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async save(application: AdmissionApplication): Promise<void> {
    await this.repo.save({
      id: application.id,
      trackingCode: application.trackingCode,
      studentFirstName: application.studentFirstName,
      studentLastName: application.studentLastName,
      studentBirthDate: application.studentBirthDate,
      studentDocumentType: application.studentDocumentType,
      studentDocumentNumber: application.studentDocumentNumber,
      studentAddress: application.studentAddress,
      gradeId: application.gradeId,
      academicYearId: application.academicYearId,
      guardianName: application.guardianName,
      guardianEmail: application.guardianEmail,
      guardianPhone: application.guardianPhone,
      status: application.status,
      feeAmount: application.feeAmount,
      paidAt: application.paidAt ? new Date(application.paidAt) : null,
      interviewDate: application.interviewDate ? new Date(application.interviewDate) : null,
      interviewNotes: application.interviewNotes,
      rejectionReason: application.rejectionReason,
      matchedUserId: application.matchedUserId,
      resultingEnrollmentId: application.resultingEnrollmentId,
    });
  }

  private toDomain(row: AdmissionApplicationOrmEntity): AdmissionApplication {
    return new AdmissionApplication(
      row.id,
      row.trackingCode,
      row.studentFirstName,
      row.studentLastName,
      row.studentBirthDate,
      row.studentDocumentType as DocumentType,
      row.studentDocumentNumber,
      row.studentAddress,
      row.gradeId,
      row.academicYearId,
      row.guardianName,
      row.guardianEmail,
      row.guardianPhone,
      row.status as AdmissionStatus,
      row.feeAmount,
      row.paidAt ? row.paidAt.toISOString() : null,
      row.interviewDate ? row.interviewDate.toISOString() : null,
      row.interviewNotes,
      row.rejectionReason,
      row.matchedUserId,
      row.resultingEnrollmentId,
      row.createdAt.toISOString(),
    );
  }
}
