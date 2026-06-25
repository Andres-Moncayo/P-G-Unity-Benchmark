import {
  ANALYTICS_BUSINESS_FILTERS,
  type AnalyticsBusinessFilter,
} from '../types/analyticsBusinessFilter';
import { useAnalyticsBusinessFilter } from '../context/AnalyticsBusinessFilterContext';

type AnalyticsFilterStripProps = {
  layout?: 'horizontal' | 'vertical';
  animateIn?: boolean;
};

/** Equal width so selection does not shift siblings. */
const PILL_MIN_WIDTH = '5.75rem';

export function AnalyticsFilterStrip({ layout = 'horizontal', animateIn = false }: AnalyticsFilterStripProps) {
  const { businessFilter, setBusinessFilter } = useAnalyticsBusinessFilter();
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      role="listbox"
      aria-label="Strategic pillar"
      className={
        isHorizontal
          ? 'flex flex-nowrap items-center gap-1'
          : 'flex flex-col gap-1'
      }
    >
      {ANALYTICS_BUSINESS_FILTERS.map((filter, index) => (
        <FilterPill
          key={filter}
          filter={filter}
          isSelected={businessFilter === filter}
          onSelect={() => setBusinessFilter(filter)}
          animateIn={animateIn}
          animationDelayMs={animateIn ? 60 + index * 45 : 0}
        />
      ))}
    </div>
  );
}

function FilterPill({
  filter,
  isSelected,
  onSelect,
  animateIn,
  animationDelayMs,
}: {
  filter: AnalyticsBusinessFilter;
  isSelected: boolean;
  onSelect: () => void;
  animateIn?: boolean;
  animationDelayMs?: number;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onSelect}
      style={{ minWidth: PILL_MIN_WIDTH, animationDelay: `${animationDelayMs ?? 0}ms` }}
      className={`shrink-0 rounded-md border px-2 py-1.5 text-center text-xs font-medium outline-none transition-[background-color,border-color,color,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-0 sm:text-sm ${
        animateIn ? 'header-filter-pill' : ''
      } ${
        isSelected
          ? 'border-gray-600 bg-black text-gray-100'
          : 'border-transparent bg-black text-gray-400 hover:border-gray-700 hover:bg-gray-950 hover:text-gray-200'
      }`}
    >
      {filter}
    </button>
  );
}
