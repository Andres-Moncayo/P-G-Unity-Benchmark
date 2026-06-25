import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/** Refetches all Analytics queries without reloading the page or changing route. */
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
  }, [queryClient]);
}
