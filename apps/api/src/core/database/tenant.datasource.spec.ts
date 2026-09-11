import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_MODULES } from './tenant.datasource';

/**
 * `TENANT_MODULES` es una lista explícita (no un glob `modules/**`) — ver el
 * comentario en tenant.datasource.ts. Si un módulo nuevo define entidades
 * TypeORM pero nadie agrega su nombre a esta lista, TypeORM nunca registra
 * esas entidades y cualquier repositorio del módulo revienta en runtime con
 * `EntityMetadataNotFoundError` en el primer query — invisible a un boot
 * smoke-check, porque TypeORM resuelve metadata de entidades de forma lazy
 * (recién en el primer query real), no al armar el grafo de DI. Ya pasó una
 * vez (módulo `notifications`, corregido en el commit que agrega esta
 * prueba). Este test evita que vuelva a pasar en silencio.
 */
describe('TENANT_MODULES', () => {
  const modulesDir = join(__dirname, '..', '..', 'modules');

  // `platform` vive en el schema `public` con su propio datasource
  // (ver platform.datasource.ts) y a propósito no está en TENANT_MODULES.
  const EXCLUDED_MODULES = ['platform'];

  function moduleHasOrmEntities(moduleName: string): boolean {
    const entitiesDir = join(modulesDir, moduleName, 'infrastructure', 'entities');
    try {
      return readdirSync(entitiesDir).some((f) => f.endsWith('.orm-entity.ts'));
    } catch {
      return false;
    }
  }

  it('incluye todo módulo que define entidades TypeORM (salvo los excluidos explícitamente)', () => {
    const modulesWithEntities = readdirSync(modulesDir).filter(
      (name) => !EXCLUDED_MODULES.includes(name) && moduleHasOrmEntities(name),
    );

    const missing = modulesWithEntities.filter((name) => !TENANT_MODULES.includes(name));

    expect(missing).toEqual([]);
  });

  it('no lista módulos que ya no existen o no tienen carpeta infrastructure/entities', () => {
    const stale = TENANT_MODULES.filter((name) => !moduleHasOrmEntities(name));

    expect(stale).toEqual([]);
  });
});
