import { buildLogoDiskPath } from './resolve-logo-path';

describe('buildLogoDiskPath', () => {
  it('convierte la URL pública del logo en la ruta de disco, descartando el query string', () => {
    const path = buildLogoDiskPath(
      'http://localhost:3001/uploads/logos/logo-tenant-1.png?v=1700000000000',
      './uploads',
    );

    expect(path.endsWith('uploads/logos/logo-tenant-1.png')).toBe(true);
  });

  it('funciona igual con un dominio de producción y sin query string', () => {
    const path = buildLogoDiskPath('https://api.skolaria.co/uploads/logos/logo-abc.jpg', 'uploads');

    expect(path.endsWith('uploads/logos/logo-abc.jpg')).toBe(true);
  });
});
