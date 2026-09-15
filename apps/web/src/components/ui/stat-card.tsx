import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export function StatCard({
  icon: Icon,
  iconTone = 'primary',
  label,
  value,
  caption,
  className,
}: {
  icon: LucideIcon;
  iconTone?: 'primary' | 'warning';
  label: string;
  value: ReactNode;
  caption: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div
        className={cn(
          'mb-2 flex h-8 w-8 items-center justify-center rounded-full',
          iconTone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] uppercase tracking-wide text-primary">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
      <div className="text-xs text-muted-foreground">{caption}</div>
    </Card>
  );
}
