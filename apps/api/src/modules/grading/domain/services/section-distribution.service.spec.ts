import { SectionDistributionService } from './section-distribution.service';

describe('SectionDistributionService', () => {
  describe('median', () => {
    it('devuelve 0 para una lista vacía', () => {
      expect(SectionDistributionService.median([])).toBe(0);
    });

    it('devuelve el valor central para una cantidad impar', () => {
      expect(SectionDistributionService.median([3, 1, 2])).toBe(2);
    });

    it('devuelve el promedio de los dos centrales para una cantidad par', () => {
      expect(SectionDistributionService.median([4, 1, 3, 2])).toBe(2.5);
    });
  });

  describe('zigzagDistribute', () => {
    it('reparte 4 estudiantes en 2 grupos balanceando la suma de promedios', () => {
      const students = [
        { enrollmentId: 'e1', average: 90 },
        { enrollmentId: 'e2', average: 80 },
        { enrollmentId: 'e3', average: 70 },
        { enrollmentId: 'e4', average: 60 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups).toEqual([
        ['e1', 'e4'],
        ['e2', 'e3'],
      ]);
    });

    it('con cantidad impar, el grupo sobrante queda en el primer grupo del zigzag', () => {
      const students = [
        { enrollmentId: 'e1', average: 95 },
        { enrollmentId: 'e2', average: 85 },
        { enrollmentId: 'e3', average: 75 },
        { enrollmentId: 'e4', average: 65 },
        { enrollmentId: 'e5', average: 55 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups[0]).toEqual(['e1', 'e4', 'e5']);
      expect(groups[1]).toEqual(['e2', 'e3']);
    });

    it('mantiene el tamaño parejo aunque todos los promedios sean iguales', () => {
      const students = [
        { enrollmentId: 'e1', average: 75 },
        { enrollmentId: 'e2', average: 75 },
        { enrollmentId: 'e3', average: 75 },
        { enrollmentId: 'e4', average: 75 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 2);

      expect(groups[0]).toHaveLength(2);
      expect(groups[1]).toHaveLength(2);
    });

    it('funciona con 3 o más grupos destino', () => {
      const students = [
        { enrollmentId: 'e1', average: 90 },
        { enrollmentId: 'e2', average: 80 },
        { enrollmentId: 'e3', average: 70 },
        { enrollmentId: 'e4', average: 60 },
        { enrollmentId: 'e5', average: 50 },
        { enrollmentId: 'e6', average: 40 },
      ];

      const groups = SectionDistributionService.zigzagDistribute(students, 3);

      expect(groups).toHaveLength(3);
      expect(groups.flat().sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
      groups.forEach((group) => expect(group).toHaveLength(2));
    });
  });
});
