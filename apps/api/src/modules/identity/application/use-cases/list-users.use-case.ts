import { Inject, Injectable } from '@nestjs/common';
import { UserFilter, UserRepositoryPort } from '../ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(UserRepositoryPort) private readonly users: UserRepositoryPort) {}

  async execute(filter?: UserFilter): Promise<User[]> {
    return this.users.findAll(filter);
  }
}
