export type LeaveType = 'vacaciones' | 'enfermedad' | 'personal' | 'otro';

export class Leave {
  constructor(
    public readonly id: string,
    public readonly employeeId: string,
    public readonly type: LeaveType,
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly reason?: string,
  ) {
    if (startDate > endDate) {
      throw new Error('La fecha de inicio debe ser anterior o igual a la fecha de fin');
    }
  }

  overlaps(other: Leave): boolean {
    return this.startDate <= other.endDate && other.startDate <= this.endDate;
  }
}
