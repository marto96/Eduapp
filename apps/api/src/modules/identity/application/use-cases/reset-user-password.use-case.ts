import { randomBytes } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';

export interface ResetUserPasswordOutput {
  temporaryPassword: string;
}

/**
 * Reset por un admin, no autoservicio: el proyecto no tiene proveedor de
 * email (ver README), así que no hay forma de mandar un link de
 * recuperación. La contraseña temporal se devuelve una sola vez en la
 * respuesta — nunca queda persistida en texto plano ni se puede
 * volver a consultar.
 */
@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(PasswordHasherPort) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(userId: string): Promise<ResetUserPasswordOutput> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const temporaryPassword = randomBytes(9).toString('base64url');
    const passwordHash = await this.hasher.hash(temporaryPassword);
    user.setPasswordHash(passwordHash);
    user.resetLoginAttempts();
    await this.users.save(user);

    return { temporaryPassword };
  }
}
