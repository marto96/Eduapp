import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ChargeFilter, ChargeRepositoryPort } from '../../application/ports/charge.repository.port';
import { Charge } from '../../domain/entities/charge.entity';
import { ChargeOrmEntity } from '../entities/charge.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmChargeRepository extends ChargeRepositoryPort {
  private readonly repo: Repository<ChargeOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ChargeOrmEntity);
  }

  async findAll(filter?: ChargeFilter): Promise<Charge[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.enrollmentId && { enrollmentId: filter.enrollmentId }),
        ...(filter?.enrollmentIds && { enrollmentId: In(filter.enrollmentIds) }),
        ...(filter?.concept && { concept: filter.concept }),
      },
      order: { dueDate: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Charge | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(charge: Charge): Promise<void> {
    await this.repo.save({
      id: charge.id,
      enrollmentId: charge.enrollmentId,
      concept: charge.concept,
      description: charge.description,
      amount: charge.amount,
      dueDate: charge.dueDate,
      discountAmount: charge.discountAmount,
      editedAt: charge.editedAt ? new Date(charge.editedAt) : null,
      voidedAt: charge.voidedAt ? new Date(charge.voidedAt) : null,
    });
  }

  private toDomain(row: ChargeOrmEntity): Charge {
    return new Charge(
      row.id,
      row.enrollmentId,
      row.concept,
      row.description,
      row.amount,
      row.dueDate,
      row.discountAmount,
      row.editedAt ? row.editedAt.toISOString() : null,
      row.voidedAt ? row.voidedAt.toISOString() : null,
    );
  }
}
