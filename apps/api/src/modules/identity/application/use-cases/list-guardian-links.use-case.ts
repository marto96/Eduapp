import { Inject, Injectable } from '@nestjs/common';
import {
  GuardianLinkFilter,
  GuardianLinkRepositoryPort,
} from '../ports/guardian-link.repository.port';
import { GuardianLink } from '../../domain/entities/guardian-link.entity';

@Injectable()
export class ListGuardianLinksUseCase {
  constructor(
    @Inject(GuardianLinkRepositoryPort) private readonly guardians: GuardianLinkRepositoryPort,
  ) {}

  async execute(filter?: GuardianLinkFilter): Promise<GuardianLink[]> {
    return this.guardians.findAll(filter);
  }
}
