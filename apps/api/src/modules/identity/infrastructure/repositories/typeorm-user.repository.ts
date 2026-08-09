import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserRepositoryPort } from '../../application/ports/user.repository.port';
import { User, UserRole } from '../../domain/entities/user.entity';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

/**
 * Adaptador concreto del puerto UserRepositoryPort usando TypeORM.
 * `TENANT_DATA_SOURCE` ya tiene el `search_path` del tenant activo fijado
 * (ver core/database/tenant-datasource.provider.ts), a diferencia de
 * `@InjectRepository` que usa la única conexión fija del proceso.
 */
@Injectable()
export class TypeOrmUserRepository extends UserRepositoryPort {
  private readonly repo: Repository<UserOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(UserOrmEntity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.repo.save({
      id: user.id,
      email: user.email,
      passwordHash: user.getPasswordHash(),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      status: user.status,
    });
  }

  private toDomain(row: UserOrmEntity): User {
    return new User(
      row.id,
      row.email,
      row.passwordHash,
      row.firstName,
      row.lastName,
      row.roles as UserRole[],
      row.status,
    );
  }
}
