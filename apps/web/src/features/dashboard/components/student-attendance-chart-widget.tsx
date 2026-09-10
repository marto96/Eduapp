'use client';

import { useRef } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { AttendanceStatus } from '@eduapp/shared-types';
import { useMyAttendance } from '@/features/attendance/use-attendance';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';

gsap.registerPlugin(useGSAP);

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  tarde: 'Tarde',
  justificado: 'Justificado',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  presente: '#22c55e',
  tarde: '#f59e0b',
  ausente: 'hsl(var(--destructive))',
  justificado: '#60a5fa',
};

export function StudentAttendanceChartWidget() {
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: records, isLoading } = useMyAttendance();

  useGSAP(
    () => {
      gsap.from(cardRef.current, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out', delay: 0.1 });
    },
    { scope: cardRef, dependencies: [records] },
  );

  const total = records?.length ?? 0;
  const counts = (Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((status) => ({
    status,
    count: records?.filter((r) => r.status === status).length ?? 0,
  }));
  const presentRate = total > 0 ? (counts.find((c) => c.status === 'presente')!.count / total) * 100 : null;
  const chartData = counts
    .filter((c) => c.count > 0)
    .map((c) => ({ name: STATUS_LABELS[c.status], value: c.count, status: c.status }));

  return (
    <Card ref={cardRef}>
      <p className="text-[10px] uppercase tracking-wide text-primary">Mi asistencia</p>
      {isLoading ? (
        <LoadingState className="mt-2" />
      ) : total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Todavía no hay asistencia registrada.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-medium">{presentRate!.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">presente sobre {total} clases</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={32}
                    outerRadius={56}
                    paddingAngle={2}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-xs">
              {counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <li key={c.status} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: STATUS_COLORS[c.status] }}
                    />
                    <span className="text-muted-foreground">{STATUS_LABELS[c.status]}</span>
                    <span className="font-medium">{c.count}</span>
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}
