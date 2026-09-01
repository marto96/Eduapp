import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { DocumentType, User, UserRole } from '../../domain/entities/user.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException(`Ya existe un usuario con email "${input.email}"`);
    }

    if (input.documentNumber) {
      const existingByDocument = await this.users.findByDocumentNumber(input.documentNumber);
      if (existingByDocument) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
    }

    if (input.birthDate && input.birthDate > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura');
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = new User(
      randomUUID(),
      input.email,
      passwordHash,
      input.firstName,
      input.lastName,
      input.roles,
      'active',
      0,
      null,
      input.birthDate ?? null,
      input.documentType ?? null,
      input.documentNumber ?? null,
      input.address ?? null,
    );

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
