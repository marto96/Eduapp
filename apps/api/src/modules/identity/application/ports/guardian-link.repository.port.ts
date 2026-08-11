import { GuardianLink } from '../../domain/entities/guardian-link.entity';

export interface GuardianLinkFilter {
  guardianUserId?: string;
  studentUserId?: string;
}

export abstract class GuardianLinkRepositoryPort {
  abstract findAll(filter?: GuardianLinkFilter): Promise<GuardianLink[]>;
  abstract save(link: GuardianLink): Promise<void>;
}
