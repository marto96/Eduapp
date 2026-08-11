'use client';

import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useSections } from '@/features/academic/use-sections';
import { Card } from '@/components/ui/card';

export function QuickStatsWidget() {
  const { data: enrollments, isLoading: loadingEnrollments } = useEnrollments();
  const { data: sections, isLoading: loadingSections } = useSections();

  const activeEnrollments = (enrollments ?? []).filter((e) => e.status === 'active').length;

  return (
    <>
      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Matrícula activa</p>
        <p className="mt-1 text-2xl font-medium">
          {loadingEnrollments ? '…' : activeEnrollments}
        </p>
        <p className="text-xs text-muted-foreground">estudiantes</p>
      </Card>
      <Card>
        <p className="text-[10px] uppercase tracking-wide text-primary">Secciones</p>
        <p className="mt-1 text-2xl font-medium">{loadingSections ? '…' : (sections?.length ?? 0)}</p>
        <p className="text-xs text-muted-foreground">activas</p>
      </Card>
    </>
  );
}
