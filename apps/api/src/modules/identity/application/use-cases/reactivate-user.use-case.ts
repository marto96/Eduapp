import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const REACTIVATE_ALLOWED_ROLES = ['admin_institucion'];

@Injectable()
export class ReactivateUserUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<User> {
    if (!currentUser.roles.some((role) => REACTIVATE_ALLOWED_ROLES.includes(role))) {
      throw new ForbiddenException('Solo un administrador puede reactivar usuarios');
    }

    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.reactivate();
    await this.users.save(user);
    return user;
  }
}
