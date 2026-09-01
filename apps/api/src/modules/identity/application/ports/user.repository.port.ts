import { User, UserRole } from '../../domain/entities/user.entity';

export interface UserFilter {
  role?: UserRole;
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
  abstract findAll(filter?: UserFilter): Promise<User[]>;
  abstract save(user: User): Promise<void>;
}
