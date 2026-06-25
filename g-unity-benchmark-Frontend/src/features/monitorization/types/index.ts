/**
 * Tipos de TypeScript para monitorización con estructura compleja anidada
 * Mapea la respuesta del backend con nested objects
 */

export interface Engagement {
  upvotes: number;
  comments: number;
  shares: number;
}

export interface SourceObject {
  platform: string;
  subreddit?: string | null;
  author?: string | null;
  engagement: Engagement;
}

export interface SentimentObject {
  score: number; // -1 to 1
  label: "positive" | "negative" | "neutral";
  confidence: number; // 0-1
}

export interface TechnicalAnalysis {
  bug_category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  unity_version?: string | null;
  affected_platforms: string[];
}

export interface BusinessMetrics {
  churn_risk?: "low" | "medium" | "high" | null;
  churn_probability?: number | null; // 0-1
  revenue_impact?: "estimated_low" | "medium" | "high" | null;
  user_segment?: "indie" | "pro_enterprise" | "enterprise" | null;
}

export interface CompetitiveIntelligence {
  competitor_mentioned?: "unreal" | "godot" | "other" | null;
  comparison_type?: "performance" | "cost" | "features" | "support" | null;
  migration_intent?: "none" | "considering" | "migrated_from" | "migrated_to" | null;
}

export interface NPSIndicators {
  sentiment_strength?: number | null; // -2 to 2
  would_recommend?: boolean | null;
  key_factors: string[];
}

export interface MarketSignals {
  industry_trend?: "growing" | "stable" | "declining" | null;
  adoption_stage?: "evaluation" | "implementation" | "production" | null;
  company_size?: "solo" | "1-10" | "11-50" | "51-200" | "200+" | null;
  geographic_region?: "na" | "emea" | "apac" | "latam" | null;
}

export interface AlertMetadata {
  type?: "technical" | "financial" | "competitive" | "community" | null;
  urgency?: "low" | "medium" | "high" | "critical" | null;
  reach?: number | null;
  influence_score?: number | null;
}

export interface MonitorizationPost {
  id: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  date: string; // ISO datetime
  source: SourceObject;
  sentiment: SentimentObject;
  platform_mentioned: string; // unity/unreal/godot/others
  bug?: string | null;
  technical_analysis: TechnicalAnalysis;
  business_metrics: BusinessMetrics;
  competitive_intelligence: CompetitiveIntelligence;
  nps_indicators: NPSIndicators;
  market_signals: MarketSignals;
  alert_metadata: AlertMetadata;
  business_category?: string | null;
}

export interface MonitorizationBusinessCategoryGroup {
  category: string;
  posts: MonitorizationPost[];
}
