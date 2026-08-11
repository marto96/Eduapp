'use client';

import Link from 'next/link';
import { useCharges } from '@/features/finance/use-charges';
import { Card } from '@/components/ui/card';

export function PendingChargesWidget() {
  const { data: charges, isLoading } = useCharges();

  const pending = (charges ?? []).filter((c) => c.status === 'pendiente' || c.status === 'parcial');
  const totalBalance = pending.reduce((sum, c) => sum + c.balance, 0);

  return (
    <Link href="/finance" className="block">
      <Card className="transition-colors hover:border-primary">
        <p className="text-[10px] uppercase tracking-wide text-primary">Cargos pendientes</p>
        <p className="mt-1 text-2xl font-medium">{isLoading ? '…' : `$${totalBalance}`}</p>
        <p className="text-xs text-muted-foreground">{pending.length} cargo(s)</p>
      </Card>
    </Link>
  );
}
