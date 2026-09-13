import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ClassroomRepositoryPort } from '../ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';

export interface CreateClassroomInput {
  name: string;
  capacity: number;
}

@Injectable()
export class CreateClassroomUseCase {
  constructor(@Inject(ClassroomRepositoryPort) private readonly classrooms: ClassroomRepositoryPort) {}

  async execute(input: CreateClassroomInput): Promise<Classroom> {
    const classroom = new Classroom(randomUUID(), input.name, input.capacity);
    await this.classrooms.save(classroom);
    return classroom;
  }
}
