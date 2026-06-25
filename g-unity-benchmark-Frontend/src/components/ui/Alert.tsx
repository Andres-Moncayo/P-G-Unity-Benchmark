import { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
  faCircleCheck,
  faTriangleExclamation,
  faCircleExclamation,
} from '@fortawesome/free-solid-svg-icons';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantClasses: Record<AlertVariant, { bg: string; border: string; icon: any }> = {
  info: {
    bg: 'bg-unity-accent/10',
    border: 'border-unity-accent/30',
    icon: faCircleInfo,
  },
  success: {
    bg: 'bg-unity-success/10',
    border: 'border-unity-success/30',
    icon: faCircleCheck,
  },
  warning: {
    bg: 'bg-unity-warning/10',
    border: 'border-unity-warning/30',
    icon: faTriangleExclamation,
  },
  error: {
    bg: 'bg-unity-error/10',
    border: 'border-unity-error/30',
    icon: faCircleExclamation,
  },
};

const textClasses: Record<AlertVariant, string> = {
  info: 'text-unity-accent',
  success: 'text-unity-success',
  warning: 'text-unity-warning',
  error: 'text-unity-error',
};

export function Alert({ children, variant = 'info', className, dismissible, onDismiss }: AlertProps) {
  const config = variantClasses[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        config.bg,
        config.border,
        className
      )}
    >
      <FontAwesomeIcon icon={config.icon} className={cn('mt-0.5 flex-shrink-0', textClasses[variant])} />
      <div className="flex-grow text-sm">{children}</div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn('flex-shrink-0 text-lg opacity-70 hover:opacity-100', textClasses[variant])}
        >
          ×
        </button>
      )}
    </div>
  );
}
