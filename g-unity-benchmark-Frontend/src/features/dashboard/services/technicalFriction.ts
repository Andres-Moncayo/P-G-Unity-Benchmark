import { apiClient } from '../../../services/apiClient';

export interface TechnicalFrictionIssueDTO {
  id: number;
  title: string;
  severity: string;
  errorCode: string;
  impactScore?: number | null;
  status: string;
  devices?: number | null;
  trend: string;
  firstSeen: string;
  description: string;
}

export interface TechnicalFrictionCategoryDTO {
  id: number;
  name: string;
  severity: string;
  activeIssues: number;
  affectedDevices: string;
  avgResolutionTime: string;
  issues: TechnicalFrictionIssueDTO[];
}

interface TechnicalFrictionApiResponse {
  categories: TechnicalFrictionCategoryDTO[];
  meta?: { data_source?: string };
}

export async function fetchTechnicalFriction(
  engine = 'unity',
): Promise<{
  categories: TechnicalFrictionCategoryDTO[];
  fromApi: true;
}> {
  const data = await apiClient<TechnicalFrictionApiResponse>(
    `/dashboard/technical-friction?engine=${encodeURIComponent(engine)}`,
  );
  return {
    categories: data.categories ?? [],
    fromApi: true,
  };
}
