import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

@Injectable()
export class ListClassroomsUseCase {
  constructor(@Inject(ClassroomRepositoryPort) private readonly classrooms: ClassroomRepositoryPort) {}

  async execute(): Promise<Classroom[]> {
    return this.classrooms.findAll();
  }
}
