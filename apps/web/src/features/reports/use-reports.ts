'use client';

import { useQuery } from '@tanstack/react-query';
import type { AttendanceReportRow, EnrollmentReportRow, FinanceReportRow } from '@eduapp/shared-types';

async function fetchEnrollmentReport(academicYearId?: string): Promise<EnrollmentReportRow[]> {
  const qs = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await fetch(`/api/reports/enrollment${qs}`);
  if (!res.ok) throw new Error('No se pudo cargar el reporte de matrícula');
  return res.json();
}

export function useEnrollmentReport(academicYearId?: string) {
  return useQuery({
    queryKey: ['reports', 'enrollment', academicYearId ?? 'all'],
    queryFn: () => fetchEnrollmentReport(academicYearId),
  });
}

export interface AttendanceReportParams {
  from: string;
  to: string;
  sectionId: string;
  academicYearId?: string;
}

async function fetchAttendanceReport(params: AttendanceReportParams): Promise<AttendanceReportRow[]> {
  const qs = new URLSearchParams({
    from: params.from,
    to: params.to,
    sectionId: params.sectionId,
    ...(params.academicYearId && { academicYearId: params.academicYearId }),
  });
  const res = await fetch(`/api/reports/attendance?${qs.toString()}`);
  if (!res.ok) throw new Error('No se pudo cargar el reporte de asistencia');
  return res.json();
}

export function useAttendanceReport(params: AttendanceReportParams | null) {
  return useQuery({
    queryKey: ['reports', 'attendance', params],
    queryFn: () => fetchAttendanceReport(params!),
    enabled: !!params,
  });
}

export interface FinanceReportParams {
  from: string;
  to: string;
}

async function fetchFinanceReport(params: FinanceReportParams): Promise<FinanceReportRow[]> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  const res = await fetch(`/api/reports/finance?${qs.toString()}`);
  if (!res.ok) throw new Error('No se pudo cargar el reporte financiero');
  return res.json();
}

export function useFinanceReport(params: FinanceReportParams | null) {
  return useQuery({
    queryKey: ['reports', 'finance', params],
    queryFn: () => fetchFinanceReport(params!),
    enabled: !!params,
  });
}
