import { Inject, Injectable } from '@nestjs/common';
import { GradebookRepositoryPort, GradebookStudentRow } from '../ports/gradebook.repository.port';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListGradebookStudentsInput {
  academicYearId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListGradebookStudentsUseCase {
  constructor(@Inject(GradebookRepositoryPort) private readonly gradebook: GradebookRepositoryPort) {}

  async execute(input: ListGradebookStudentsInput): Promise<PaginatedResult<GradebookStudentRow>> {
    const { page, pageSize } = normalizePagination(input.page, input.pageSize);
    const { items, total } = await this.gradebook.searchStudents({
      academicYearId: input.academicYearId,
      search: input.search,
      page,
      pageSize,
    });
    return { items, total, page, pageSize };
  }
}
