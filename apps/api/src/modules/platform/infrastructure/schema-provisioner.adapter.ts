import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SchemaProvisionerPort } from '../application/ports/schema-provisioner.port';
import { createSchemaAndMigrate } from '../../../core/database/schema-provisioner';

@Injectable()
export class SchemaProvisionerAdapter extends SchemaProvisionerPort {
  constructor(@InjectDataSource('platform') private readonly platformDataSource: DataSource) {
    super();
  }

  async provisionSchema(schemaName: string): Promise<void> {
    await createSchemaAndMigrate(this.platformDataSource, schemaName);
  }
}
