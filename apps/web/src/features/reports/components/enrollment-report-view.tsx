'use client';

import { useSections } from '@/features/academic/use-sections';
import { useAcademicYears } from '@/features/academic/use-academic-years';
import { useEnrollmentReport } from '../use-reports';
import { Card } from '@/components/ui/card';

export function EnrollmentReportView() {
  const { data: sections } = useSections();
  const { data: years } = useAcademicYears();
  const { data: rows, isLoading, error } = useEnrollmentReport();

  const sectionNameById = new Map(sections?.map((s) => [s.id, s.name]));

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">No se pudo cargar el reporte.</p>;
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin matrículas todavía.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{years?.length ?? 0} año(s) lectivo(s) registrados.</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <Card key={row.sectionId} className="flex items-center justify-between py-3">
            <p className="font-medium">Sección {sectionNameById.get(row.sectionId) ?? row.sectionId}</p>
            <p className="text-sm text-muted-foreground">
              Activos: {row.active} · Retirados: {row.withdrawn} · Completados: {row.completed} · Total:{' '}
              {row.total}
            </p>
          </Card>
        ))}
      </ul>
    </div>
  );
}
