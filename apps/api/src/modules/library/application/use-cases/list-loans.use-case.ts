import { Inject, Injectable } from '@nestjs/common';
import { LoanFilter, LoanRepositoryPort } from '../ports/loan.repository.port';
import { Loan } from '../../domain/entities/loan.entity';
import { GuardianAccessService } from '../../../identity/application/services/guardian-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListLoansUseCase {
  constructor(
    @Inject(LoanRepositoryPort) private readonly loans: LoanRepositoryPort,
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  async execute(filter: LoanFilter | undefined, currentUser: JwtPayload): Promise<Loan[]> {
    const roles = currentUser.roles;

    if (
      roles.includes('admin_institucion') ||
      roles.includes('directivo') ||
      roles.includes('secretaria')
    ) {
      return this.loans.findAll(filter);
    }

    if (roles.includes('estudiante')) {
      return this.loans.findAll({ ...filter, studentId: currentUser.sub });
    }

    if (roles.includes('padre_tutor')) {
      const childrenIds = await this.guardianAccess.getChildrenIds(currentUser.sub);
      const lists = await Promise.all(
        childrenIds.map((studentId) => this.loans.findAll({ ...filter, studentId })),
      );
      return lists.flat();
    }

    return [];
  }
}
