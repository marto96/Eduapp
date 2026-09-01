import { generateTrackingCode } from './generate-tracking-code';

describe('generateTrackingCode', () => {
  it('genera un código con el prefijo SOL- y 6 caracteres', () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^SOL-[A-Z2-9]{6}$/);
  });

  it('no repite el mismo código en 1000 generaciones seguidas', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateTrackingCode()));
    expect(codes.size).toBe(1000);
  });
});
