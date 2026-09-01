'use client';

import { useAcademicYears } from '../use-academic-years';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

export function AcademicYearsList() {
  const { data: years, isLoading, error } = useAcademicYears();

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">No se pudieron cargar los años lectivos.</p>;
  if (!years || years.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay años lectivos.</p>;
  }

  return (
    <ul className="space-y-2">
      {years.map((year) => (
        <Card key={year.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{year.name}</p>
            <p className="text-sm text-muted-foreground">
              {year.startDate} — {year.endDate}
            </p>
          </div>
          <span className="text-xs uppercase text-muted-foreground">{year.status}</span>
        </Card>
      ))}
    </ul>
  );
}
