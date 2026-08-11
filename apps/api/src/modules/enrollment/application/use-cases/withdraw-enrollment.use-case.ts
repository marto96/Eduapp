import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';

@Injectable()
export class WithdrawEnrollmentUseCase {
  constructor(@Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort) {}

  async execute(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${id}"`);
    }

    enrollment.withdraw();
    await this.enrollments.save(enrollment);
    return enrollment;
  }
}
