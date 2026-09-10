'use client';

import { useRef } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Charge } from '@eduapp/shared-types';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { chargeDisplayStatus, type ChargeDisplayStatus } from '@/features/finance/charge-display-status';

gsap.registerPlugin(useGSAP);

const STATUS_LABELS: Record<ChargeDisplayStatus, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  vencido: 'Vencido',
  anulado: 'Anulado',
};

const STATUS_COLORS: Record<ChargeDisplayStatus, string> = {
  pagado: '#22c55e',
  pendiente: '#f59e0b',
  parcial: '#60a5fa',
  vencido: 'hsl(var(--destructive))',
  anulado: 'hsl(var(--muted-foreground))',
};

export function PortalPaymentsChart({ charges }: { charges: Charge[] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(cardRef.current, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out', delay: 0.2 });
    },
    { scope: cardRef, dependencies: [charges] },
  );

  const total = charges.length;
  const owed = charges
    .filter((c) => c.status === 'pendiente' || c.status === 'parcial')
    .reduce((sum, c) => sum + c.balance, 0);
  const counts = (Object.keys(STATUS_LABELS) as ChargeDisplayStatus[]).map((status) => ({
    status,
    count: charges.filter((c) => chargeDisplayStatus(c) === status).length,
  }));
  const chartData = counts
    .filter((c) => c.count > 0)
    .map((c) => ({ name: STATUS_LABELS[c.status], value: c.count, status: c.status }));

  return (
    <Card ref={cardRef}>
      <p className="text-[10px] uppercase tracking-wide text-primary">Pagos</p>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Todavía no hay cargos.</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-medium">{formatCurrency(owed)}</p>
          <p className="text-xs text-muted-foreground">pendiente de pago</p>
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
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[c.status] }} />
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
