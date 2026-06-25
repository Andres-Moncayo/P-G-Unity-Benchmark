import { faBolt } from '@fortawesome/free-solid-svg-icons';
import { cn } from '../../../utils/cn';

export const SERVICE_DRAFT_CTA = {
  label: 'Service Draft',
  icon: faBolt,
  iconClassName:
    'shrink-0 !text-[13px] leading-none text-[rgba(110,193,255,0.9)]',
  className: cn(
    'inline-flex h-[26px] min-h-0 max-h-[26px] cursor-pointer items-center gap-1 rounded-sm border px-2 py-0.5',
    '!text-[13px] font-medium leading-none transition-all duration-300',
    'border-[rgba(110,193,255,0.3)] bg-[rgba(110,193,255,0.08)] text-[rgba(110,193,255,0.9)]',
    'shadow-sm shadow-[rgba(110,193,255,0.12)] hover:bg-[rgba(110,193,255,0.12)] hover:border-[rgba(110,193,255,0.5)] hover:shadow-md hover:shadow-[rgba(110,193,255,0.2)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ),
  labelClassName: 'text-[13px] leading-none',
} as const;
