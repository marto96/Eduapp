import { DocumentTypePrice } from './document-type-price.entity';

describe('DocumentTypePrice', () => {
  it('se crea con un monto válido', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    expect(price.amount).toBe(15000);
  });

  it('permite monto cero (gratis)', () => {
    const price = new DocumentTypePrice('constancia_matricula', 0);
    expect(price.amount).toBe(0);
  });

  it('rechaza un monto negativo al crear', () => {
    expect(() => new DocumentTypePrice('otro', -100)).toThrow('El precio no puede ser negativo');
  });

  it('updateAmount actualiza el monto', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    price.updateAmount(20000);
    expect(price.amount).toBe(20000);
  });

  it('updateAmount rechaza un monto negativo', () => {
    const price = new DocumentTypePrice('certificado_notas', 15000);
    expect(() => price.updateAmount(-1)).toThrow('El precio no puede ser negativo');
  });
});
