import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'neutral' | 'outline';
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs',
          variant === 'accent' && 'bg-primary/20 text-primary',
          variant === 'neutral' && 'bg-muted text-muted-foreground',
          variant === 'outline' && 'border border-primary text-primary',
          className,
        )}
        {...props}
      />
    );
  },
);
Tag.displayName = 'Tag';
