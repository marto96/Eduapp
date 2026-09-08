import { PlatformAdmin } from './platform-admin.entity';

describe('PlatformAdmin', () => {
  it('arranca sin 2FA configurado', () => {
    const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active');
    expect(admin.totpEnabled).toBe(false);
    expect(admin.getTotpSecret()).toBeNull();
    expect(admin.getRecoveryCodeHashes()).toBeNull();
  });

  it('startTotpSetup guarda el secreto como pendiente, sin habilitar 2FA todavía', () => {
    const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active');
    admin.startTotpSetup('SECRET123', ['hash1', 'hash2']);

    expect(admin.getTotpSecret()).toBe('SECRET123');
    expect(admin.getRecoveryCodeHashes()).toEqual(['hash1', 'hash2']);
    expect(admin.totpEnabled).toBe(false);
  });

  it('confirmTotp habilita 2FA solo si hay un secreto pendiente', () => {
    const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active');
    expect(() => admin.confirmTotp()).toThrow('No hay ningún alta de 2FA pendiente para confirmar');

    admin.startTotpSetup('SECRET123', ['hash1']);
    admin.confirmTotp();
    expect(admin.totpEnabled).toBe(true);
  });

  it('consumeRecoveryCodeHash saca ese código de la lista, de un solo uso', () => {
    const admin = new PlatformAdmin('admin-1', 'a@a.com', 'hash', 'Admin', 'active', 'SECRET123', true, [
      'hash1',
      'hash2',
    ]);

    admin.consumeRecoveryCodeHash('hash1');

    expect(admin.getRecoveryCodeHashes()).toEqual(['hash2']);
  });
});
