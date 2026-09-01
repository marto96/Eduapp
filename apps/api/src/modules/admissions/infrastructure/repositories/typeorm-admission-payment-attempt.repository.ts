import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdmissionPaymentAttemptRepositoryPort } from '../../application/ports/admission-payment-attempt.repository.port';
import {
  AdmissionPaymentAttempt,
  AdmissionPaymentAttemptStatus,
} from '../../domain/entities/admission-payment-attempt.entity';
import { AdmissionPaymentAttemptOrmEntity } from '../entities/admission-payment-attempt.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAdmissionPaymentAttemptRepository extends AdmissionPaymentAttemptRepositoryPort {
  private readonly repo: Repository<AdmissionPaymentAttemptOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionPaymentAttemptOrmEntity);
  }

  async findById(id: string): Promise<AdmissionPaymentAttempt | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row
      ? new AdmissionPaymentAttempt(
          row.id,
          row.admissionApplicationId,
          row.gatewayPreferenceId,
          row.amount,
          row.status as AdmissionPaymentAttemptStatus,
          row.createdAt.toISOString(),
        )
      : null;
  }

  async save(attempt: AdmissionPaymentAttempt): Promise<void> {
    await this.repo.save({
      id: attempt.id,
      admissionApplicationId: attempt.admissionApplicationId,
      gatewayPreferenceId: attempt.gatewayPreferenceId,
      amount: attempt.amount,
      status: attempt.status,
    });
  }
}
