import { Inject, Injectable } from '@nestjs/common';
import {
  GuardianLinkCandidate,
  GuardianLinkCandidateRepositoryPort,
} from '../ports/guardian-link-candidate.repository.port';

const MAX_RESULTS = 20;

@Injectable()
export class SearchGuardianLinkCandidatesUseCase {
  constructor(
    @Inject(GuardianLinkCandidateRepositoryPort)
    private readonly candidates: GuardianLinkCandidateRepositoryPort,
  ) {}

  async execute(search?: string): Promise<GuardianLinkCandidate[]> {
    return this.candidates.search({ search, limit: MAX_RESULTS });
  }
}
