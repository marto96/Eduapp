import { Subject } from '../../domain/entities/subject.entity';

export abstract class SubjectRepositoryPort {
  abstract findAll(): Promise<Subject[]>;
  abstract save(subject: Subject): Promise<void>;
}
