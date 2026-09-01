import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

export function LoadingState({
  label = 'Cargando...',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Spinner className="h-3.5 w-3.5" />
      {label}
    </p>
  );
}
