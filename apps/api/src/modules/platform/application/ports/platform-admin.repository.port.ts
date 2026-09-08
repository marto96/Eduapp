import { PlatformAdmin } from '../../domain/entities/platform-admin.entity';

export abstract class PlatformAdminRepositoryPort {
  abstract findByEmail(email: string): Promise<PlatformAdmin | null>;
  abstract findById(id: string): Promise<PlatformAdmin | null>;
  abstract save(admin: PlatformAdmin): Promise<void>;
}
