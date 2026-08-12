import { Inject, Injectable } from '@nestjs/common';
import { AttendanceRecordRepositoryPort } from '../../../attendance/application/ports/attendance-record.repository.port';

export interface AttendanceReportRow {
  sectionId: string;
  presente: number;
  ausente: number;
  tarde: number;
  justificado: number;
  total: number;
  attendanceRate: number;
}

export interface GetAttendanceReportInput {
  from: string;
  to: string;
  sectionId: string;
  academicYearId?: string;
}

/**
 * El puerto no soporta un rango de fechas (solo `date` exacta) — se trae
 * todo lo que matchea sección/año y se filtra el rango acá, mismo patrón
 * de "agregar en memoria sobre findAll()" que el resto de reports.
 * `sectionId` es obligatorio: es la única forma de saber a qué sección
 * pertenece cada registro (el `AttendanceRecord` no guarda sectionId
 * propio, se resuelve vía join a `enrollments` en el repo).
 */
@Injectable()
export class GetAttendanceReportUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort) private readonly attendance: AttendanceRecordRepositoryPort,
  ) {}

  async execute(input: GetAttendanceReportInput): Promise<AttendanceReportRow[]> {
    const records = await this.attendance.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    const inRange = records.filter((r) => r.date >= input.from && r.date <= input.to);

    const row: AttendanceReportRow = {
      sectionId: input.sectionId,
      presente: 0,
      ausente: 0,
      tarde: 0,
      justificado: 0,
      total: 0,
      attendanceRate: 0,
    };

    for (const record of inRange) {
      row[record.status] += 1;
      row.total += 1;
    }
    row.attendanceRate = row.total > 0 ? Math.round((row.presente / row.total) * 100) : 0;

    return [row];
  }
}
