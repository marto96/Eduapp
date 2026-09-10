import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { DocumentType, User } from '../../domain/entities/user.entity';
import { isUniqueViolation } from '../../../../core/database/postgres-error.util';

export interface EditMyProfileInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

@Injectable()
export class EditMyProfileUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(userId: string, input: EditMyProfileInput): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (input.documentNumber && input.documentNumber !== user.documentNumber) {
      const existing = await this.users.findByDocumentNumber(input.documentNumber);
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          `Ya existe un usuario con número de documento "${input.documentNumber}"`,
        );
      }
    }

    if (input.birthDate && input.birthDate > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura');
    }

    user.editProfile(input);

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
