import { Classroom } from './classroom.entity';

describe('Classroom', () => {
  it('se crea con nombre y capacidad', () => {
    const classroom = new Classroom('c-1', 'Aula 201', 30);
    expect(classroom.name).toBe('Aula 201');
    expect(classroom.capacity).toBe(30);
  });

  it('rechaza capacidad menor o igual a cero', () => {
    expect(() => new Classroom('c-1', 'Aula 201', 0)).toThrow('La capacidad debe ser mayor a cero');
    expect(() => new Classroom('c-1', 'Aula 201', -5)).toThrow('La capacidad debe ser mayor a cero');
  });
});
