export type AttendanceStatus = 'presente' | 'ausente' | 'tarde' | 'justificado';

export class AttendanceRecord {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly date: string,
    public status: AttendanceStatus,
  ) {}
}
