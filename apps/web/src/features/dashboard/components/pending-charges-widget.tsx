'use client';

import Link from 'next/link';
import { useCharges } from '@/features/finance/use-charges';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { chargeDisplayStatus } from '@/features/finance/charge-display-status';

export function PendingChargesWidget() {
  const { data: charges, isLoading } = useCharges();

  const pending = (charges ?? []).filter((c) => c.status === 'pendiente' || c.status === 'parcial');
  const totalBalance = pending.reduce((sum, c) => sum + c.balance, 0);
  const overdueCount = pending.filter((c) => chargeDisplayStatus(c) === 'vencido').length;

  return (
    <Link href="/finance" className="block">
      <Card
        className={cn(
          'relative overflow-hidden transition-colors hover:border-primary',
          overdueCount > 0 && 'border-warning/40 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-warning',
        )}
      >
        <p className="text-[10px] uppercase tracking-wide text-primary">Cargos pendientes</p>
        <p className="mt-1 text-2xl font-medium">{isLoading ? '…' : formatCurrency(totalBalance)}</p>
        {overdueCount > 0 ? (
          <p className="text-xs font-medium text-warning">{overdueCount} vencido(s)</p>
        ) : (
          <p className="text-xs text-muted-foreground">{pending.length} cargo(s)</p>
        )}
      </Card>
    </Link>
  );
}
