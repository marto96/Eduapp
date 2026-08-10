import { Inject, Injectable } from '@nestjs/common';
import { SubjectRepositoryPort } from '../ports/subject.repository.port';
import { Subject } from '../../domain/entities/subject.entity';

@Injectable()
export class ListSubjectsUseCase {
  constructor(@Inject(SubjectRepositoryPort) private readonly subjects: SubjectRepositoryPort) {}

  async execute(): Promise<Subject[]> {
    return this.subjects.findAll();
  }
}
