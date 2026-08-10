import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { PasswordHasherPort } from '../../../../core/security/password-hasher.port';
import { User, UserRole } from '../../domain/entities/user.entity';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
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

    const passwordHash = await this.hasher.hash(input.password);
    const user = new User(
      randomUUID(),
      input.email,
      passwordHash,
      input.firstName,
      input.lastName,
      input.roles,
      'active',
    );

    await this.users.save(user);
    return user;
  }
}
