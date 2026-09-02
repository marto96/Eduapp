import { buildWompiReference, parseWompiReference } from './wompi-reference';

describe('wompi-reference', () => {
  it('arma y desarma la referencia con el mismo subdominio y externalReference', () => {
    const reference = buildWompiReference('colegio-demo', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

    expect(parseWompiReference(reference)).toEqual({
      subdomain: 'colegio-demo',
      externalReference: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
  });

  it('devuelve null si la referencia no tiene el separador esperado', () => {
    expect(parseWompiReference('sin-separador')).toBeNull();
  });
});
