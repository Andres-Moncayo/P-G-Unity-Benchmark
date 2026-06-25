import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-unity-accent/20 text-unity-accent border border-unity-accent/30',
  success: 'bg-unity-success/20 text-unity-success border border-unity-success/30',
  warning: 'bg-unity-warning/20 text-unity-warning border border-unity-warning/30',
  error: 'bg-unity-error/20 text-unity-error border border-unity-error/30',
  info: 'bg-unity-accent/20 text-unity-accent border border-unity-accent/30',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
