'use client';

import { useRef } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useGradebook } from '@/features/grading/use-gradebook';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

gsap.registerPlugin(useGSAP);

/**
 * Variante del `StudentGradesChartWidget` (panel del propio estudiante)
 * para el portal de familia: acá el hijo activo ya lo elige la pestaña de
 * `PortalView`, así que solo recibe el `enrollmentId` en vez de resolverlo
 * él mismo — mismo endpoint (`useGradebook`), mismo estilo de gráfica.
 */
export function PortalGradesChart({ enrollmentId }: { enrollmentId: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: gradebook, isLoading } = useGradebook(enrollmentId);

  useGSAP(
    () => {
      gsap.from(cardRef.current, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out' });
    },
    { scope: cardRef, dependencies: [gradebook] },
  );

  const subjects = gradebook?.subjects ?? [];
  const overallAverage =
    subjects.length > 0
      ? subjects.reduce((sum, s) => sum + s.accumulatedGrade, 0) / subjects.length
      : null;

  const chartData = subjects.map((s) => ({
    subject: s.subjectName,
    promedio: Number(s.accumulatedGrade.toFixed(2)),
  }));

  return (
    <Card ref={cardRef}>
      <p className="text-[10px] uppercase tracking-wide text-primary">Notas</p>
      {isLoading ? (
        <LoadingState className="mt-2" />
      ) : subjects.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Todavía no hay notas cargadas.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-medium">{overallAverage!.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">promedio general</p>
          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={28} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="promedio"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
