import { Inject, Injectable } from '@nestjs/common';
import { GuardianLinkRepositoryPort } from '../ports/guardian-link.repository.port';

@Injectable()
export class GuardianAccessService {
  constructor(
    @Inject(GuardianLinkRepositoryPort) private readonly guardians: GuardianLinkRepositoryPort,
  ) {}

  async getChildrenIds(guardianUserId: string): Promise<string[]> {
    const links = await this.guardians.findAll({ guardianUserId });
    return links.map((link) => link.studentUserId);
  }
}
