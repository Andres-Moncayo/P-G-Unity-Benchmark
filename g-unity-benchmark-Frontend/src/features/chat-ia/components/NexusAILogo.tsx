import { cn } from '../../../utils/cn';

type NexusAILogoSize = 'xs' | 'sm' | 'md' | 'lg';
/** `nav` = fits the 32px sidebar icon slot like FontAwesome items */
type NexusAILogoVariant = 'plain' | 'contained' | 'hero' | 'nav';

type NexusAILogoTone = 'brand' | 'light';

interface NexusAILogoProps {
  size?: NexusAILogoSize;
  variant?: NexusAILogoVariant;
  tone?: NexusAILogoTone;
  className?: string;
  title?: string;
}

const markSizeMap: Record<NexusAILogoSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-[22px] w-[22px]',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
};

const containerMap: Record<NexusAILogoSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

/** Minimal bot — fills the viewBox so it reads large in sidebar & chat */
function NexusRobotMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2.25V5.35"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="12" cy="1.85" r="1.3" fill="currentColor" />
      <rect
        x="4"
        y="5.15"
        width="16"
        height="10.85"
        rx="3.75"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <circle cx="9.2" cy="10.35" r="1.4" fill="currentColor" />
      <circle cx="14.8" cy="10.35" r="1.4" fill="currentColor" />
      <rect
        x="6.5"
        y="16.65"
        width="11"
        height="5.35"
        rx="2.35"
        stroke="currentColor"
        strokeWidth="2.25"
      />
    </svg>
  );
}

export function NexusAILogo({
  size = 'md',
  variant = 'plain',
  tone = 'brand',
  className,
  title = 'Nexus AI',
}: NexusAILogoProps) {
  const resolvedSize = variant === 'nav' ? 'sm' : size;
  const mark = <NexusRobotMark className={cn('shrink-0', markSizeMap[resolvedSize])} />;
  const isLight = tone === 'light';

  if (variant === 'nav') {
    return (
      <span
        className={cn('inline-flex items-center justify-center', className)}
        title={title}
        aria-label={title}
      >
        {mark}
      </span>
    );
  }

  if (variant === 'plain') {
    return (
      <span
        className={cn('inline-flex', isLight ? 'text-gray-100' : 'text-[#00ADEF]', className)}
        title={title}
        aria-label={title}
      >
        {mark}
      </span>
    );
  }

  if (variant === 'hero') {
    if (isLight) {
      return (
        <span
          className={cn('inline-flex items-center justify-center text-[#00ADEF]', className)}
          title={title}
          aria-label={title}
        >
          {mark}
        </span>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-xl border border-[#00ADEF]/20 bg-gradient-to-br from-[#00ADEF]/20 to-[#00ADEF]/5 text-[#00ADEF] shadow-[0_0_24px_rgba(0,173,239,0.12)]',
          containerMap.lg,
          className,
        )}
        title={title}
        aria-label={title}
      >
        {mark}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl border border-[#00ADEF]/15 bg-[#00ADEF]/[0.08]',
        isLight ? 'text-gray-100' : 'text-[#00ADEF]',
        containerMap[size],
        className,
      )}
      title={title}
      aria-label={title}
    >
      {mark}
    </span>
  );
}
