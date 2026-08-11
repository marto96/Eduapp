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

  it('secretaria puede manage Finance pero solo read AcademicYear', () => {
    const ability = factory.createForUser(payload(['secretaria']));
    expect(ability.can('create', 'Finance')).toBe(true);
    expect(ability.can('read', 'Finance')).toBe(true);
    expect(ability.can('create', 'AcademicYear')).toBe(false);
    expect(ability.can('read', 'AcademicYear')).toBe(true);
  });

  it('secretaria puede manage Hr, pero docente/estudiante no tienen ninguna ability sobre Hr', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('create', 'Hr')).toBe(true);
    expect(factory.createForUser(payload(['secretaria'])).can('read', 'Hr')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('read', 'Hr')).toBe(false);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'Hr')).toBe(false);
  });

  it('docente y estudiante solo pueden read Finance', () => {
    expect(factory.createForUser(payload(['docente'])).can('create', 'Finance')).toBe(false);
    expect(factory.createForUser(payload(['docente'])).can('read', 'Finance')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'Finance')).toBe(true);
  });

  it('secretaria puede manage Document, docente/estudiante solo read (a diferencia de Hr)', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('create', 'Document')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('create', 'Document')).toBe(false);
    expect(factory.createForUser(payload(['docente'])).can('read', 'Document')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'Document')).toBe(true);
  });

  it('secretaria puede manage Announcement, docente/estudiante solo read', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('create', 'Announcement')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('create', 'Announcement')).toBe(false);
    expect(factory.createForUser(payload(['docente'])).can('read', 'Announcement')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'Announcement')).toBe(true);
  });

  it('secretaria puede manage Event, docente/estudiante solo read', () => {
    expect(factory.createForUser(payload(['secretaria'])).can('create', 'Event')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('create', 'Event')).toBe(false);
    expect(factory.createForUser(payload(['docente'])).can('read', 'Event')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('read', 'Event')).toBe(true);
  });

  it('docente y estudiante pueden manage Message (a diferencia de Announcement/Event/Hr, mensajería es entre pares)', () => {
    expect(factory.createForUser(payload(['docente'])).can('create', 'Message')).toBe(true);
    expect(factory.createForUser(payload(['docente'])).can('update', 'Message')).toBe(true);
    expect(factory.createForUser(payload(['estudiante'])).can('create', 'Message')).toBe(true);
    expect(factory.createForUser(payload(['padre_tutor'])).can('create', 'Message')).toBe(true);
  });

  it('un rol desconocido no obtiene ninguna ability', () => {
    const ability = factory.createForUser(payload(['padre_tutor']));
    expect(ability.can('read', 'AcademicYear')).toBe(true);
    expect(ability.can('create', 'AcademicYear')).toBe(false);
    expect(ability.can('delete', 'AcademicYear')).toBe(false);
  });
});
