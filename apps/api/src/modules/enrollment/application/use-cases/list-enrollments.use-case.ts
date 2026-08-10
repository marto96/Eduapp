import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentFilter, EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';

@Injectable()
export class ListEnrollmentsUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
  ) {}

  async execute(filter?: EnrollmentFilter): Promise<Enrollment[]> {
    return this.enrollments.findAll(filter);
  }
}
