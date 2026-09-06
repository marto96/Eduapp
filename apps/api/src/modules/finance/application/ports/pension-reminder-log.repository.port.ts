import { PensionReminderLog } from '../../domain/entities/pension-reminder-log.entity';

export abstract class PensionReminderLogRepositoryPort {
  abstract existsByChargeId(chargeId: string): Promise<boolean>;
  abstract save(log: PensionReminderLog): Promise<void>;
}
