import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GuardianLinkRepositoryPort } from '../ports/guardian-link.repository.port';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { GuardianLink } from '../../domain/entities/guardian-link.entity';

export interface RequestGuardianLinkInput {
  guardianUserId: string;
  studentUserId: string;
}

@Injectable()
export class RequestGuardianLinkUseCase {
  constructor(
    @Inject(GuardianLinkRepositoryPort) private readonly guardians: GuardianLinkRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: RequestGuardianLinkInput): Promise<GuardianLink> {
    const guardian = await this.users.findById(input.guardianUserId);
    if (!guardian) {
      throw new NotFoundException(`No existe el usuario "${input.guardianUserId}"`);
    }
    if (!guardian.hasRole('padre_tutor')) {
      throw new BadRequestException('El usuario no tiene rol "padre_tutor"');
    }

    const student = await this.users.findById(input.studentUserId);
    if (!student) {
      throw new NotFoundException(`No existe el usuario "${input.studentUserId}"`);
    }
    if (!student.hasRole('estudiante')) {
      throw new BadRequestException('El usuario no tiene rol "estudiante"');
    }

    const existing = await this.guardians.findAll({
      guardianUserId: input.guardianUserId,
      studentUserId: input.studentUserId,
    });
    if (existing.length > 0) {
      throw new ConflictException('Ese vínculo ya existe (o ya está pendiente de aprobación)');
    }

    const link = new GuardianLink(randomUUID(), input.guardianUserId, input.studentUserId, 'pending');
    await this.guardians.save(link);
    return link;
  }
}
