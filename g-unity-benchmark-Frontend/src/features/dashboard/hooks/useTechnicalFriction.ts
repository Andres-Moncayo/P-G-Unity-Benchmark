import { useQuery } from '@tanstack/react-query';
import { fetchTechnicalFriction } from '../services/technicalFriction';

export function useTechnicalFriction(engine = 'unity') {
  return useQuery({
    queryKey: ['technical-friction', engine],
    queryFn: () => fetchTechnicalFriction(engine),
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
