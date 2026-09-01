import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

export abstract class ClassCancellationRepositoryPort {
  abstract findOne(scheduleId: string, date: string): Promise<ClassCancellation | null>;
  abstract findByScheduleIds(scheduleIds: string[], from: string, to: string): Promise<ClassCancellation[]>;
  abstract findById(id: string): Promise<ClassCancellation | null>;
  abstract save(cancellation: ClassCancellation): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
