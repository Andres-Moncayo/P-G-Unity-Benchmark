import { useQuery } from '@tanstack/react-query';
import {
  getHeaderDbStatus,
  getHeaderLastUpdate,
  getHeaderSourcesCount,
} from '../../../services/headerService';

export function useHeaderSourcesCount() {
  return useQuery({
    queryKey: ['header', 'sourcesCount'],
    queryFn: getHeaderSourcesCount,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useHeaderLastUpdate() {
  return useQuery({
    queryKey: ['header', 'lastUpdate'],
    queryFn: getHeaderLastUpdate,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useHeaderDatabaseStatus() {
  return useQuery({
    queryKey: ['header', 'dbStatus'],
    queryFn: getHeaderDbStatus,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}
