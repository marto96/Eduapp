export interface DistributableStudent {
  enrollmentId: string;
  average: number;
}

export class SectionDistributionService {
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Reparte en "serpiente" (snake draft): ordena por promedio descendente y
   * alterna la dirección de asignación cada `groupCount` estudiantes, para
   * que la suma de promedios quede lo más pareja posible entre grupos.
   */
  static zigzagDistribute(students: DistributableStudent[], groupCount: number): string[][] {
    const sorted = [...students].sort((a, b) => b.average - a.average);
    const groups: string[][] = Array.from({ length: groupCount }, () => []);

    sorted.forEach((student, index) => {
      const round = Math.floor(index / groupCount);
      const posInRound = index % groupCount;
      const groupIndex = round % 2 === 0 ? posInRound : groupCount - 1 - posInRound;
      groups[groupIndex].push(student.enrollmentId);
    });

    return groups;
  }
}
