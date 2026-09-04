import { Inject, Injectable } from '@nestjs/common';
import { UserFilter, UserRepositoryPort } from '../ports/user.repository.port';
import { User, UserRole } from '../../domain/entities/user.entity';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  /**
   * Sin `page`/`pageSize`, devuelve el array completo (comportamiento sin
   * cambios) — lo siguen usando así más de una decena de formularios para
   * poblar selects de "elegí un estudiante/docente". Con `page`/`pageSize`,
   * pagina de verdad (pantalla de administración de usuarios).
   */
  async execute(
    role?: UserRole,
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<User[] | PaginatedResult<User>> {
    const trimmedSearch = search?.trim();
    const filter: UserFilter | undefined =
      role || trimmedSearch ? { role, search: trimmedSearch || undefined } : undefined;

    if (page === undefined && pageSize === undefined) {
      const { items } = await this.users.findAll(filter);
      return items;
    }

    const { page: safePage, pageSize: safePageSize } = normalizePagination(page, pageSize);
    const { items, total } = await this.users.findAll(filter, { page: safePage, pageSize: safePageSize });
    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
