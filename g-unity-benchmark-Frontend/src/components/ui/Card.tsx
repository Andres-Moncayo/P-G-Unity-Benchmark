import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  interactive?: boolean;
}

export function Card({ children, className, hoverable, interactive }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-unity-border bg-unity-card backdrop-blur-sm transition-all duration-300',
        hoverable && 'hover:border-unity-accent/50 hover:shadow-[0_0_20px_rgba(0,173,239,0.1)]',
        interactive && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
