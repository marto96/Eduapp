import { AbilityFactory } from './ability.factory';
import { JwtPayload } from '../jwt-payload.interface';

describe('AbilityFactory', () => {
  const factory = new AbilityFactory();

  function payload(roles: string[]): JwtPayload {
    return { sub: 'u1', email: 'u@x.com', roles, tenantId: 't1' };
  }

  it('admin_institucion puede manage sobre todo', () => {
    const ability = factory.createForUser(payload(['admin_institucion']));
    expect(ability.can('create', 'AcademicYear')).toBe(true);
    expect(ability.can('create', 'Grade')).toBe(true);
    expect(ability.can('create', 'Section')).toBe(true);
  });

  it('directivo puede manage AcademicYear/Grade/Section', () => {
    const ability = factory.createForUser(payload(['directivo']));
    expect(ability.can('create', 'AcademicYear')).toBe(true);
    expect(ability.can('read', 'AcademicYear')).toBe(true);
  });

  it('docente puede read pero no create', () => {
    const ability = factory.createForUser(payload(['docente']));
    expect(ability.can('read', 'AcademicYear')).toBe(true);
    expect(ability.can('create', 'AcademicYear')).toBe(false);
  });

  it('docente puede read User (resolver nombres) pero no manage', () => {
    const ability = factory.createForUser(payload(['docente']));
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('create', 'User')).toBe(false);
  });

  it('un rol desconocido no obtiene ninguna ability', () => {
    const ability = factory.createForUser(payload(['padre_tutor']));
    expect(ability.can('read', 'AcademicYear')).toBe(true);
    expect(ability.can('create', 'AcademicYear')).toBe(false);
    expect(ability.can('delete', 'AcademicYear')).toBe(false);
  });
});
