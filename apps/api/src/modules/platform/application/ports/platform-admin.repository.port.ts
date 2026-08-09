import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';

export abstract class PlatformAdminRepositoryPort {
  abstract findByEmail(email: string): Promise<PlatformAdmin | null>;
}
