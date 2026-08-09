import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded border border-border p-6', className)}
        {...props}
      />
    );
  },
);
Card.displayName = 'Card';
