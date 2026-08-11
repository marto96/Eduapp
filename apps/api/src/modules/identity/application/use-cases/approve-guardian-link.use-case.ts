import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GuardianLinkRepositoryPort } from '../ports/guardian-link.repository.port';
import { GuardianLink } from '../../domain/entities/guardian-link.entity';

@Injectable()
export class ApproveGuardianLinkUseCase {
  constructor(
    @Inject(GuardianLinkRepositoryPort) private readonly guardians: GuardianLinkRepositoryPort,
  ) {}

  async execute(id: string): Promise<GuardianLink> {
    const link = await this.guardians.findById(id);
    if (!link) {
      throw new NotFoundException(`No existe el vínculo "${id}"`);
    }

    link.approve();
    await this.guardians.save(link);
    return link;
  }
}
