/**
 * Puerto para aprovisionar el schema de un tenant nuevo (CREATE SCHEMA +
 * correr migraciones de tenant contra él). Implementación concreta en
 * infrastructure/, apoyada en core/database/schema-provisioner.ts.
 */
export abstract class SchemaProvisionerPort {
  abstract provisionSchema(schemaName: string): Promise<void>;
}
