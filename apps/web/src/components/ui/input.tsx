import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
