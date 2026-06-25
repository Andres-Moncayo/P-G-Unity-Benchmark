import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

interface BusinessFiltersProps {
  onFilterChange?: (filters: { sentiment: string | null; platform: string | null; searchQuery: string }) => void;
}

export function BusinessFilters({ onFilterChange }: BusinessFiltersProps) {
  const [selectedSentiment, setSelectedSentiment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const sentimentFilters = ['All', 'Negative', 'Positive','Neutral'];

  const handleSentimentChange = (sentiment: string) => {
    const sentimentValue = sentiment === 'All' ? null : sentiment.toLowerCase();
    setSelectedSentiment(sentiment);
    onFilterChange?.({
      sentiment: sentimentValue,
      platform: null,
      searchQuery,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange?.({
      sentiment: selectedSentiment === 'All' ? null : selectedSentiment.toLowerCase(),
      platform: null,
      searchQuery: value,
    });
  };

  return (
    <div className="mb-6 flex items-center justify-between rounded-[14px] px-4 py-3">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <input
            type="text"
            placeholder="Search in feeds..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-950/90 pl-10 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/80 focus:ring-1 focus:ring-blue-400/40"
          />
        </div>
      </div>

      <div className="flex gap-2.5 items-center">
        <span className="py-1 text-sm text-gray-400">Sentiment</span>
        {sentimentFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => handleSentimentChange(filter)}
            className={`px-3 py-1 rounded-md text-sm transition-colors cursor-pointer ${
              selectedSentiment === filter
                ? 'bg-blue-500 text-white shadow-[0_0_0_1px_rgba(158,177,255,0.18),0_0_16px_rgba(59,130,246,0.16)]'
                : 'bg-gray-900 text-gray-400 ring-1 ring-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}