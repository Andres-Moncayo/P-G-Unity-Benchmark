import { apiClient } from '../../../services/apiClient';
import { MonitorizationPost, MonitorizationBusinessCategoryGroup } from '../types';

type ListParams = {
  sentiment?: string | null;
  platform?: string | null;
  bug?: string | null;
  business?: string | null;
  skip?: number;
  limit?: number;
};

export async function listPosts(params: ListParams = {}) {
  const qs = new URLSearchParams();
  if (params.sentiment) qs.set('sentiment', params.sentiment);
  if (params.platform) qs.set('platform', params.platform);
  if (params.bug) qs.set('bug', params.bug);
  if (params.business) qs.set('business', params.business);
  qs.set('skip', String(params.skip ?? 0));
  qs.set('limit', String(params.limit ?? 20));
  return apiClient<MonitorizationPost[]>(`/monitorization/posts?${qs.toString()}`);
}

export async function getPostById(id: number) {
  return apiClient<MonitorizationPost>(`/monitorization/posts/${id}`);
}

export async function listPostsBySentiment(sentiment: string, limit = 50) {
  return apiClient<MonitorizationPost[]>(`/monitorization/posts/sentiment/${encodeURIComponent(sentiment)}?limit=${limit}`);
}

export async function listPostsByCategory(limit = 20, sourceLimit = 200) {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('source_limit', String(sourceLimit));
  return apiClient<MonitorizationBusinessCategoryGroup[]>(`/monitorization/posts/categories?${qs.toString()}`);
}

export async function getMonitoredForums() {
  return apiClient<{ count: number }>(`/monitorization/monitored_forums`);
}

export async function getMonitoredBugs() {
  return apiClient<{ count: number }>(`/monitorization/monitored_bugs`);
}

export async function countPosts() {
  return apiClient<{ count: number }>(`/monitorization/count_posts`);
}