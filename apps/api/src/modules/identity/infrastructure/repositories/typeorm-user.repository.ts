import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PaginatedUsers, UserFilter, UserRepositoryPort } from '../../application/ports/user.repository.port';
import { PaginationParams } from '../../../../core/http/pagination.dto';
import { DocumentType, User, UserRole } from '../../domain/entities/user.entity';
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

  async findByDocumentNumber(documentNumber: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { documentNumber } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter?: UserFilter, pagination?: PaginationParams): Promise<PaginatedUsers> {
    const query = this.repo.createQueryBuilder('user').orderBy('user.created_at', 'DESC');
    if (filter?.role) {
      query.andWhere(':role = ANY(user.roles)', { role: filter.role });
    }
    if (filter?.search) {
      query.andWhere(
        '(user.first_name ILIKE :term OR user.last_name ILIKE :term OR user.email ILIKE :term)',
        { term: `%${filter.search}%` },
      );
    }

    if (!pagination) {
      const rows = await query.getMany();
      return { items: rows.map((row) => this.toDomain(row)), total: rows.length };
    }

    const [rows, total] = await query
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
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
      failedLoginAttempts: user.getFailedLoginAttempts(),
      lockedUntil: user.getLockedUntil(),
      birthDate: user.birthDate,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      address: user.address,
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
      row.failedLoginAttempts,
      row.lockedUntil,
      row.birthDate,
      row.documentType as DocumentType | null,
      row.documentNumber,
      row.address,
    );
  }
}
