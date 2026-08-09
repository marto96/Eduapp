import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { tenantSchemaOptions } from './tenant.datasource';

/**
 * Mantiene un pool acotado de DataSources, uno por schema de tenant, con
 * expiración LRU para no agotar conexiones cuando hay muchos tenants activos.
 * Cada DataSource fija su `search_path` al schema del tenant + public.
 */
@Injectable()
export class TenantConnectionProvider implements OnModuleDestroy {
  private readonly connections = new Map<string, DataSource>();
  private readonly maxOpenConnections = 50;

  async getConnectionForSchema(schemaName: string): Promise<DataSource> {
    const cached = this.connections.get(schemaName);
    if (cached?.isInitialized) return cached;

    if (this.connections.size >= this.maxOpenConnections) {
      await this.evictOldest();
    }

    const dataSource = new DataSource(tenantSchemaOptions(schemaName));

    await dataSource.initialize();
    this.connections.set(schemaName, dataSource);
    return dataSource;
  }

  private async evictOldest() {
    const oldestKey = this.connections.keys().next().value;
    if (!oldestKey) return;
    const ds = this.connections.get(oldestKey);
    await ds?.destroy();
    this.connections.delete(oldestKey);
  }

  async onModuleDestroy() {
    await Promise.all([...this.connections.values()].map((ds) => ds.destroy()));
  }
}
