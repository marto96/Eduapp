import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentFilter, EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { EnrollmentAccessService } from '../services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListEnrollmentsUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(filter: EnrollmentFilter | undefined, currentUser: JwtPayload): Promise<Enrollment[]> {
    const rows = await this.enrollments.findAll(filter);
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds === null) return rows;
    return rows.filter((enrollment) => allowedEnrollmentIds.has(enrollment.id));
  }
}
