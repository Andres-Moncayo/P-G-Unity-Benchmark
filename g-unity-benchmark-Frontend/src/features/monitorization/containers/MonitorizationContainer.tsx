import { useEffect, useRef } from 'react';
import { BusinessFilters } from '../components/BusinessFilters';
import { LiveMonitoringFeed } from '../components/LiveMonitoringFeed';
import { FeedStats } from '../components/FeedStats';
import { useMonitorization } from '../hooks/useMonitorization';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { ApiErrorDisplay } from '../../../components/ui';

export function MonitorizationContainer() {
  const { posts, loading, error, stats, setParams, refresh } = useMonitorization();
  const monitorizationRefreshToken = useNavigationStore((state) => state.monitorizationRefreshToken);
  const isFirstRender = useRef(true);

  const handleFilterChange = (newFilters: {
    sentiment: string | null;
    platform: string | null;
    searchQuery: string;
  }) => {
    setParams({
      sentiment: newFilters.sentiment,
      platform: newFilters.platform,
      searchQuery: newFilters.searchQuery,
      bug: null,
      skip: 0,
      limit: 20,
    });
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    void refresh();
  }, [monitorizationRefreshToken, refresh]);

  return (
    <div className="w-full min-h-screen">
      {/* Main content container with proper spacing */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Content area with spacing */}
        <div className="space-y-6">
          <FeedStats stats={stats} />
          <BusinessFilters onFilterChange={handleFilterChange} />
          {error ? (
            <ApiErrorDisplay error={error} title="Error al cargar el feed de monitorización" />
          ) : (
            <LiveMonitoringFeed posts={posts} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
