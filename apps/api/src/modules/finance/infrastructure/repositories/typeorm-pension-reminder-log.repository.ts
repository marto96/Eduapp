import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PensionReminderLogRepositoryPort } from '../../application/ports/pension-reminder-log.repository.port';
import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';
import { PensionReminderLogOrmEntity } from '../entities/pension-reminder-log.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPensionReminderLogRepository extends PensionReminderLogRepositoryPort {
  private readonly repo: Repository<PensionReminderLogOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PensionReminderLogOrmEntity);
  }

  async existsByChargeId(chargeId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { chargeId } });
    return count > 0;
  }

  async save(log: PensionReminderLog): Promise<void> {
    await this.repo.save({ id: log.id, chargeId: log.chargeId, sentAt: new Date(log.sentAt) });
  }
}
