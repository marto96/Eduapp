import { GradeWeightConfig } from './grade-weight-config.entity';

describe('GradeWeightConfig', () => {
  it('usa 3.0 como nota mínima por defecto si no se especifica', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    expect(config.minPassingGrade).toBe(3.0);
  });

  it('rechaza una nota mínima fuera de rango al crear', () => {
    expect(() => new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 0)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
    expect(() => new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1, 5.1)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
  });

  it('rechaza una nota mínima fuera de rango al editar', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    expect(() => config.edit(0.6, 0.3, 0.1, -1)).toThrow(
      'La nota mínima aprobatoria debe estar entre 0 y 5',
    );
  });

  it('edita la nota mínima cuando es válida', () => {
    const config = new GradeWeightConfig('cfg-1', 0.65, 0.25, 0.1);
    config.edit(0.6, 0.3, 0.1, 3.5);
    expect(config.minPassingGrade).toBe(3.5);
  });
});
