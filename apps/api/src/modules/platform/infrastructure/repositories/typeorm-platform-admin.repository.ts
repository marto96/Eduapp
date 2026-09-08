import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformAdminRepositoryPort } from '../../application/ports/platform-admin.repository.port';
import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';
import { PlatformAdminOrmEntity } from '../entities/platform-admin.orm-entity';

@Injectable()
export class TypeOrmPlatformAdminRepository extends PlatformAdminRepositoryPort {
  constructor(
    @InjectRepository(PlatformAdminOrmEntity, 'platform')
    private readonly repo: Repository<PlatformAdminOrmEntity>,
  ) {
    super();
  }

  async findByEmail(email: string): Promise<PlatformAdmin | null> {
    const row = await this.repo.findOne({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<PlatformAdmin | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(admin: PlatformAdmin): Promise<void> {
    await this.repo.save({
      id: admin.id,
      email: admin.email,
      passwordHash: admin.getPasswordHash(),
      fullName: admin.fullName,
      status: admin.status,
      totpSecret: admin.getTotpSecret(),
      totpEnabled: admin.totpEnabled,
      recoveryCodeHashes: admin.getRecoveryCodeHashes(),
    });
  }

  private toDomain(row: PlatformAdminOrmEntity): PlatformAdmin {
    return new PlatformAdmin(
      row.id,
      row.email,
      row.passwordHash,
      row.fullName,
      row.status,
      row.totpSecret,
      row.totpEnabled,
      row.recoveryCodeHashes,
    );
  }
}
