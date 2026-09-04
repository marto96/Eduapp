import { Inject, Injectable } from '@nestjs/common';
import { GradebookRepositoryPort, GradebookStudentRow } from '../ports/gradebook.repository.port';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

export interface ListGradebookStudentsInput {
  academicYearId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListGradebookStudentsUseCase {
  constructor(
    @Inject(GradebookRepositoryPort) private readonly gradebook: GradebookRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(
    input: ListGradebookStudentsInput,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<GradebookStudentRow>> {
    const { page, pageSize } = normalizePagination(input.page, input.pageSize);
    const allowed = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    const { items, total } = await this.gradebook.searchStudents({
      academicYearId: input.academicYearId,
      search: input.search,
      page,
      pageSize,
      enrollmentIds: allowed === null ? undefined : Array.from(allowed),
    });
    return { items, total, page, pageSize };
  }
}
