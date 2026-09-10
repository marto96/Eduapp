import { User } from './user.entity';

describe('User.editProfile', () => {
  function buildUser(): User {
    return new User(
      'u-1',
      'juan@test.com',
      'hash',
      'Juan',
      'Pérez',
      ['estudiante'],
      'active',
    );
  }

  it('actualiza nombre, apellido y datos personales', () => {
    const user = buildUser();

    user.editProfile({
      firstName: 'Juana',
      lastName: 'Pérez Gómez',
      birthDate: '2010-05-01',
      documentType: 'TI',
      documentNumber: '1002003000',
      address: 'Calle 10 # 20-30',
      phone: '3001234567',
    });

    expect(user.firstName).toBe('Juana');
    expect(user.lastName).toBe('Pérez Gómez');
    expect(user.birthDate).toBe('2010-05-01');
    expect(user.documentType).toBe('TI');
    expect(user.documentNumber).toBe('1002003000');
    expect(user.address).toBe('Calle 10 # 20-30');
    expect(user.phone).toBe('3001234567');
  });

  it('nunca toca email ni roles, aunque no reciba esos campos', () => {
    const user = buildUser();

    user.editProfile({ firstName: 'Juana', lastName: 'Pérez' });

    expect(user.email).toBe('juan@test.com');
    expect(user.roles).toEqual(['estudiante']);
  });

  it('limpia un campo opcional a null si no viene en el input', () => {
    const user = buildUser();
    user.editProfile({ firstName: 'Juan', lastName: 'Pérez', phone: '3001234567' });

    user.editProfile({ firstName: 'Juan', lastName: 'Pérez' });

    expect(user.phone).toBeNull();
  });
});
