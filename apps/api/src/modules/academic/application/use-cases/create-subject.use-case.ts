import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SubjectRepositoryPort } from '../ports/subject.repository.port';
import { Subject } from '../../domain/entities/subject.entity';

export interface CreateSubjectInput {
  name: string;
  area: string;
}

@Injectable()
export class CreateSubjectUseCase {
  constructor(@Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort) {}

  async execute(input: CreateSubjectInput): Promise<Subject> {
    const subject = new Subject(randomUUID(), input.name, input.area);
    await this.subjects.save(subject);
    return subject;
  }
}
