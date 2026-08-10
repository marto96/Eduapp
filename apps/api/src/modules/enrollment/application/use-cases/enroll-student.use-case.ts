import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';

export interface EnrollStudentInput {
  studentId: string;
  sectionId: string;
  academicYearId: string;
}

@Injectable()
export class EnrollStudentUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: EnrollStudentInput): Promise<Enrollment> {
    const student = await this.users.findById(input.studentId);
    if (!student) {
      throw new NotFoundException(`No existe el usuario "${input.studentId}"`);
    }
    if (!student.hasRole('estudiante')) {
      throw new BadRequestException('El usuario no tiene rol "estudiante"');
    }

    const existingActive = await this.enrollments.findActiveByStudentAndYear(
      input.studentId,
      input.academicYearId,
    );
    if (existingActive) {
      throw new ConflictException('El estudiante ya tiene una matrícula activa en ese año lectivo');
    }

    const enrollment = new Enrollment(
      randomUUID(),
      input.studentId,
      input.sectionId,
      input.academicYearId,
      'active',
    );

    await this.enrollments.save(enrollment);
    return enrollment;
  }
}
