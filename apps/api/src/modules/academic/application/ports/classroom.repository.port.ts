import { Classroom } from '../../domain/entities/classroom.entity';

export abstract class ClassroomRepositoryPort {
  abstract findAll(): Promise<Classroom[]>;
  abstract save(classroom: Classroom): Promise<void>;
}
