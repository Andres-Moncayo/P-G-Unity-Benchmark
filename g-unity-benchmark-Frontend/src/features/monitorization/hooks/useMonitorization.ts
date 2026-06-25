import { useEffect, useState, useCallback, useMemo } from 'react';
import * as svc from '../services/monitorizationService';
import { MonitorizationPost } from '../types';
import { useAnalyticsBusinessFilter } from '../../analytics/context/AnalyticsBusinessFilterContext';
import { analyticsBusinessToApiParam } from '../../analytics/types/analyticsBusinessFilter';

type FetchParams = {
  sentiment?: string | null;
  platform?: string | null;
  bug?: string | null;
  searchQuery?: string | null;
  skip?: number;
  limit?: number;
};

export function useMonitorization(initialParams: FetchParams = {}) {
  const { businessFilter } = useAnalyticsBusinessFilter();
  const business = analyticsBusinessToApiParam(businessFilter);

  const [allPosts, setAllPosts] = useState<MonitorizationPost[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(initialParams.sentiment ?? null);
  const [searchQuery, setSearchQuery] = useState<string>(initialParams.searchQuery ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [forumsCount, setForumsCount] = useState<number | null>(null);
  const [competitorsCount, setCompetitorsCount] = useState<number | null>(null);

  const bugsCount = useMemo(() => {
    return allPosts.reduce((total, post) => {
      const bugValue = post.technical_analysis?.bug_category?.trim().toLowerCase() ?? '';
      return total + (bugValue && bugValue !== 'none' ? 1 : 0);
    }, 0);
  }, [allPosts]);

  const postsCount = useMemo(() => allPosts.length, [allPosts]);

  const matchesSentiment = useCallback((post: MonitorizationPost, filter: string | null) => {
    if (!filter) return true;

    const normalizedSentiment = post.sentiment.label.toLowerCase();
    const normalizedFilter = filter.toLowerCase();

    if (normalizedFilter === 'positive') {
      return normalizedSentiment.includes('posit') || normalizedSentiment === 'pos';
    }

    if (normalizedFilter === 'negative') {
      return normalizedSentiment.includes('negat') || normalizedSentiment === 'neg';
    }

    if (normalizedFilter === 'neutral') {
      return normalizedSentiment.includes('neutral') || normalizedSentiment === 'neu';
    }

    return false;
  }, []);

  const matchesSearchQuery = useCallback((post: MonitorizationPost, query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return true;

    const searchableText = [
      post.title,
      post.summary,
      post.platform_mentioned,
      post.alert_metadata?.type,
      post.source.platform,
      post.sentiment.label,
      post.technical_analysis?.bug_category,
      post.business_category,
      post.nps_indicators?.key_factors.join(' ') ?? '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(trimmedQuery);
  }, []);

  const posts = useMemo(() => {
    return allPosts.filter((post) => {
      return matchesSentiment(post, sentimentFilter) && matchesSearchQuery(post, searchQuery);
    });
  }, [allPosts, sentimentFilter, searchQuery, matchesSearchQuery, matchesSentiment]);

  const fetchAll = useCallback(async (params: FetchParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const fetchParams = {
        sentiment: sentimentFilter ?? undefined,
        platform: params.platform,
        bug: params.bug,
        business: business ?? undefined,
        skip: params.skip ?? 0,
        limit: params.limit ?? 50,
      };

      const data = await svc.listPosts(fetchParams);
      setAllPosts(Array.isArray(data) ? data : []);

      const [forumsRes, compRes] = await Promise.allSettled([
        svc.getMonitoredForums(),
        svc.countPosts(),
      ]);

      if (forumsRes.status === 'fulfilled') setForumsCount((forumsRes.value as { count?: number }).count ?? null);
      if (compRes.status === 'fulfilled') setCompetitorsCount((compRes.value as { count?: number }).count ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [business, sentimentFilter]);

  const setParams = useCallback((newParams: FetchParams) => {
    setSentimentFilter(newParams.sentiment ?? null);
    setSearchQuery(newParams.searchQuery ?? '');
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return {
    posts,
    loading,
    error,
    refresh: useCallback((p?: FetchParams) => fetchAll(p), [fetchAll]),
    setParams,
    stats: {
      forumsCount,
      bugsCount,
      competitorsCount,
      postsCount,
    },
  } as const;
}
