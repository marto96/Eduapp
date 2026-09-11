import { DocumentType } from '../../domain/entities/user.entity';

export interface GuardianLinkCandidate {
  id: string;
  fullName: string;
  documentType: DocumentType | null;
  documentNumber: string | null;
  birthDate: string | null;
  gradeName: string | null;
  sectionName: string | null;
}

export interface SearchGuardianLinkCandidatesFilter {
  search?: string;
  limit: number;
}

export abstract class GuardianLinkCandidateRepositoryPort {
  abstract search(filter: SearchGuardianLinkCandidatesFilter): Promise<GuardianLinkCandidate[]>;
}
