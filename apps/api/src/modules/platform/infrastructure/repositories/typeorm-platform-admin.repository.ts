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
    if (!row) return null;
    return new PlatformAdmin(row.id, row.email, row.passwordHash, row.fullName, row.status);
  }
}
