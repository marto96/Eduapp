import { Grade } from '../../domain/entities/grade.entity';

export abstract class GradeRepositoryPort {
  abstract findAll(): Promise<Grade[]>;
  abstract findById(id: string): Promise<Grade | null>;
  abstract save(grade: Grade): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
