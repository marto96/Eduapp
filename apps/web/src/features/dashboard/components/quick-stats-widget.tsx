'use client';

import { GraduationCap, LayoutGrid } from 'lucide-react';
import { useEnrollments } from '@/features/enrollment/use-enrollments';
import { useSections } from '@/features/academic/use-sections';
import { StatCard } from '@/components/ui/stat-card';

export function QuickStatsWidget() {
  const { data: enrollments, isLoading: loadingEnrollments } = useEnrollments();
  const { data: sections, isLoading: loadingSections } = useSections();

  const activeEnrollments = (enrollments ?? []).filter((e) => e.status === 'active').length;

  return (
    <>
      <StatCard
        icon={GraduationCap}
        label="Matrícula activa"
        value={loadingEnrollments ? '…' : activeEnrollments}
        caption="estudiantes"
      />
      <StatCard
        icon={LayoutGrid}
        label="Secciones"
        value={loadingSections ? '…' : (sections?.length ?? 0)}
        caption="activas"
      />
    </>
  );
}
