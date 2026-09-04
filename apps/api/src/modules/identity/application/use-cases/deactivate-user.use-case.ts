import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const DEACTIVATE_ALLOWED_ROLES = ['admin_institucion'];

@Injectable()
export class DeactivateUserUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<User> {
    if (!currentUser.roles.some((role) => DEACTIVATE_ALLOWED_ROLES.includes(role))) {
      throw new ForbiddenException('Solo un administrador puede inactivar usuarios');
    }

    if (id === currentUser.sub) {
      throw new BadRequestException('No podés inactivar tu propia cuenta');
    }

    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.suspend();
    await this.users.save(user);
    return user;
  }
}
