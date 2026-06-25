import { apiClient } from '../../../services/apiClient';

export type ServiceDraftSource = 'technical_friction' | 'analytics_insight';

export interface ServiceDraftPodRole {
  title: string;
  focus: string;
}

export interface ServiceDraftDTO {
  draft_id: string;
  analyzed_post_id: number;
  source: string;
  generated_at: string;
  status: string;
  technical: {
    issue_id: string;
    title: string;
    category: string;
    bug_category: string | null;
    severity: string;
    impact: number;
    confidence: number;
    trend: string;
    retention_impact: string;
    technical_signals: string[];
    recommendation: string;
    source_url: string | null;
    last_updated: string;
  };
  studio_mapping: {
    studio_name: string;
    studio_focus: string;
    rationale: string;
  };
  business_value: {
    revenue_shrinkage_usd: number;
    revenue_shrinkage_label: string;
    operational_risk_score: number;
    operational_risk_label: string;
    opportunity_estimate_usd: number;
    opportunity_label: string;
    commercial_justification: string;
  };
  executive_summary: string;
  technical_impact: string;
  business_impact: string;
  suggested_pod: ServiceDraftPodRole[];
  roi: {
    economic_impact: string;
    risk_mitigated: string;
    potential_value: string;
    justification: string;
  };
  editable_draft: string;
  meta: Record<string, unknown>;
}

export async function generateServiceDraft(params: {
  analyzedPostId: number;
  source: ServiceDraftSource;
}): Promise<ServiceDraftDTO> {
  return apiClient<ServiceDraftDTO>('/dashboard/service-draft', {
    method: 'POST',
    body: JSON.stringify({
      analyzed_post_id: params.analyzedPostId,
      source: params.source,
    }),
  });
}
