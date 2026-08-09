import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    return user;
  }
}
