import { User, UserRole } from '../../domain/entities/user.entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';

export interface UserFilter {
  role?: UserRole;
  /** Coincidencia parcial, sin distinguir mayúsculas, contra nombre, apellido o email. */
  search?: string;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
}

/**
 * Puerto (interfaz) que el caso de uso necesita. La implementación concreta
 * (TypeORM, en este caso) vive en infrastructure/ y se inyecta por DI.
 * El caso de uso nunca conoce TypeORM.
 */
export abstract class UserRepositoryPort {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByDocumentNumber(documentNumber: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  /**
   * `pagination` es opcional a propósito: además de la pantalla de
   * administración de usuarios (paginada), hay más de una decena de
   * formularios que usan este mismo método para poblar selects de "elegí
   * un estudiante/docente" y esperan la lista completa sin paginar — ver
   * `ListUsersUseCase`.
   */
  abstract findAll(filter: UserFilter | undefined, pagination?: PaginationParams): Promise<PaginatedUsers>;
  abstract save(user: User): Promise<void>;
}
