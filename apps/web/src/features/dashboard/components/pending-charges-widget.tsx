'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useCharges } from '@/features/finance/use-charges';
import { StatCard } from '@/components/ui/stat-card';
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
      <StatCard
        icon={Wallet}
        iconTone={overdueCount > 0 ? 'warning' : 'primary'}
        className={cn(
          'relative overflow-hidden transition-colors hover:border-primary',
          overdueCount > 0 && 'border-warning/40 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-warning',
        )}
        label="Cargos pendientes"
        value={isLoading ? '…' : formatCurrency(totalBalance)}
        caption={
          overdueCount > 0 ? (
            <span className="font-medium text-warning">{overdueCount} vencido(s)</span>
          ) : (
            `${pending.length} cargo(s)`
          )
        }
      />
    </Link>
  );
}
