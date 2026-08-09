import { Grade } from '../../domain/entities/grade.entity';

export abstract class GradeRepositoryPort {
  abstract findAll(): Promise<Grade[]>;
  abstract save(grade: Grade): Promise<void>;
}
