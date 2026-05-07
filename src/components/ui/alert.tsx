import * as React from 'react';
import { cn } from '@/utils/cn';

const VARIANTS = {
  default: 'bg-background text-foreground',
  destructive: 'border-destructive/50 text-destructive [&>svg]:text-destructive',
  success: 'border-emerald-500/50 text-emerald-700 bg-emerald-50'
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANTS;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-3 text-sm',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';
