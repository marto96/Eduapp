import { Inject, Injectable } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListAdmissionApplicationsOutput {
  items: AdmissionApplication[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ListAdmissionApplicationsUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
  ) {}

  async execute(
    status: AdmissionStatus | undefined,
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<ListAdmissionApplicationsOutput> {
    const { page: safePage, pageSize: safePageSize } = normalizePagination(page, pageSize);
    const trimmedSearch = search?.trim();

    const filter = status || trimmedSearch ? { status, search: trimmedSearch || undefined } : undefined;
    const { items, total } = await this.applications.findAll(filter, {
      page: safePage,
      pageSize: safePageSize,
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
