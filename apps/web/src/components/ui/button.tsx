import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
          variant === 'primary' && 'bg-primary text-background hover:opacity-90',
          variant === 'ghost' && 'hover:bg-muted',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
