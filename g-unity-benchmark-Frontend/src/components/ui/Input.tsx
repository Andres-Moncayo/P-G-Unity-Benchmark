import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconPosition = 'left', className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-sm font-medium text-unity-text-primary">{label}</label>}
        <div className="relative flex items-center">
          {icon && (
            <div className={cn('absolute text-unity-text-tertiary', iconPosition === 'left' ? 'left-3' : 'right-3')}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg border border-unity-border bg-unity-dark px-3 py-2 text-unity-text-primary',
              'placeholder-unity-text-muted transition-all duration-200',
              'focus:border-unity-accent focus:outline-none focus:ring-2 focus:ring-unity-accent/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-unity-error focus:ring-unity-error/20',
              icon && (iconPosition === 'left' ? 'pl-9' : 'pr-9'),
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-unity-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
