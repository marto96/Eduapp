import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { DocumentType, User, UserRole } from '../../domain/entities/user.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

/**
 * A diferencia del resto de `User` (CASL le da 'manage' a admin_institucion
 * Y directivo — ver `AbilityFactory`), editar datos de un usuario queda
 * reservado solo a admin_institucion: se decidió así explícitamente, no es
 * un descuido. El controller igual exige `ability.can('manage', 'User')`
 * como primer filtro (bloquea docente/secretaria/etc.), y acá se agrega el
 * filtro más estricto.
 */
const EDIT_ALLOWED_ROLES = ['admin_institucion'];

export interface EditUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
}

@Injectable()
export class EditUserUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(id: string, input: EditUserInput, currentUser: JwtPayload): Promise<User> {
    if (!currentUser.roles.some((role) => EDIT_ALLOWED_ROLES.includes(role))) {
      throw new ForbiddenException('Solo un administrador puede editar los datos de un usuario');
    }

    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (input.email !== user.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe un usuario con email "${input.email}"`);
      }
    }

    if (input.documentNumber && input.documentNumber !== user.documentNumber) {
      const existingByDocument = await this.users.findByDocumentNumber(input.documentNumber);
      if (existingByDocument && existingByDocument.id !== id) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
    }

    if (input.birthDate && input.birthDate > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura');
    }

    user.edit(input);

    try {
      await this.users.save(user);
    } catch (err) {
      if (isUniqueViolation(err) && input.documentNumber) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
      throw err;
    }
    return user;
  }
}
