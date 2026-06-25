from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DashboardKPIResponse(BaseModel):
    """Tres KPI principales + metadatos del trimestre analizado."""

    model_config = ConfigDict(extra="forbid")

    meta: dict[str, Any] = Field(default_factory=dict)
    opportunity_index: dict[str, Any] = Field(default_factory=dict)
    market_share_shift: dict[str, Any] = Field(default_factory=dict)
    revenue_per_employee: dict[str, Any] = Field(default_factory=dict)


class OpportunityIndexDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    meta: dict[str, Any] = Field(default_factory=dict)
    opportunity_index: dict[str, Any] = Field(default_factory=dict)


class MarketShareShiftDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    meta: dict[str, Any] = Field(default_factory=dict)
    market_share_shift: dict[str, Any] = Field(default_factory=dict)


class RevenuePerEmployeeDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    meta: dict[str, Any] = Field(default_factory=dict)
    revenue_per_employee: dict[str, Any] = Field(default_factory=dict)


class DeveloperSatisfactionResponse(BaseModel):
    """Radar‑chart data for developer satisfaction per engine.

    The six axes are:
        - technical_support
        - ease_of_use
        - performance
        - documentation
        - community
        - price_value
    All values are normalized to the range 0‑100.
    """

    model_config = ConfigDict(extra="forbid")
    selected_engine: str = Field(
        ..., description="Engine for which the radar is rendered"
    )
    baseline_engine: str = Field(
        "unity", description="Engine used as baseline for comparison (always Unity)"
    )
    scores: dict[str, int] = Field(..., description="Values for the six axes (0‑100)")
    comparison: dict[str, int] | None = Field(
        None,
        description="Difference (selected – baseline) for each axis, if baseline data is available",
    )


class DashboardAlertItem(BaseModel):
    id: int
    title: str
    summary: str | None = None
    url: str | None = None
    date_post: str | None = None
    platform_mentioned: str | None = None
    severity: str | None = None
    alert_type: str | None = None
    alert_urgency: str | None = None
    bug_category: str | None = None


class DashboardAlertsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    meta: dict[str, Any] = Field(default_factory=dict)
    alerts: list[DashboardAlertItem] = Field(default_factory=list)


# ── Real-Time Intelligence Monitor ──────────────────────────────────


class RealTimeMonitorAlertItem(BaseModel):
    id: int
    source: str
    time: str
    category: str
    sentiment: str  # 'positive' | 'negative'
    title: str
    tags: list[str] = Field(default_factory=list)
    live: bool = False


class RealTimeMonitorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    feeds: int = 0
    forums: int = 0
    news: int = 0
    reports: int = 0
    social: int = 0
    total_posts: int = 0
    alerts_total: int = 0
    active_filter: str = "Todos"
    available_filters: list[str] = Field(default_factory=list)
    alerts: list[RealTimeMonitorAlertItem] = Field(default_factory=list)


# ── Dashboard Highlights ─────────────────────────────────────────────


class DashboardHighlightItem(BaseModel):
    id: int
    title: str
    content: str
    game_engine: str
    category: str


class DashboardPostHighlightItem(BaseModel):
    id: int
    title: str
    summary: str
    url: str | None = None
    date: str | None = None
    game_engine: str
    category: str


class DashboardHighlightsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active_filter: str = "All"
    available_filters: list[str] = Field(default_factory=list)
    category_counts: dict[str, int] = Field(default_factory=dict)
    meta: dict[str, Any] = Field(default_factory=dict)
    highlights: list[DashboardHighlightItem] = Field(default_factory=list)
    post_highlights: list[DashboardPostHighlightItem] = Field(default_factory=list)


# ── NPS + Churn Predictor ────────────────────────────────────────────


class NpsEngineScore(BaseModel):
    """NPS calculado para un engine: (promoters - detractors) / total * 100, escala 0-100."""

    engine: str
    nps_raw: float = Field(description="NPS en escala -100 a +100")
    nps_pct: int = Field(description="NPS normalizado a 0-100 para la UI")
    promoters: int
    detractors: int
    total: int


class ChurnPrediction(BaseModel):
    risk: str = Field(description="Nivel dominante: low | medium | high")
    probability: float = Field(
        description="Probabilidad de churn 0.0 a 1.0 para la barra de la UI"
    )
    avg_churn_pct: float = Field(
        description="Promedio real de churn_probability en la BD (%)"
    )
    high_count: int
    medium_count: int
    low_count: int


class NpsChurnResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nps: dict[str, int] = Field(
        description="NPS 0-100 por engine: unity, godot, unreal, industry (promedio)"
    )
    churn: ChurnPrediction
    meta: dict[str, Any] = Field(default_factory=dict)


# ── Analytics Insights (Dashboard card) ─────────────────────────────


class AnalyticsInsightItem(BaseModel):
    id: int
    title: str
    description: str
    severity: str
    category: str
    impact: int
    trend: str
    confidence: int
    recommendation: str
    lastUpdated: str


class AnalyticsInsightsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    meta: dict[str, Any] = Field(default_factory=dict)
    insights: list[AnalyticsInsightItem] = Field(default_factory=list)


# -- Technical Friction Heatmap --------------------------------------


class TechnicalFrictionIssue(BaseModel):
    id: int
    title: str
    severity: str
    errorCode: str
    impactScore: int | None = None
    status: str = "active"
    devices: int | None = None
    trend: str
    firstSeen: str
    description: str


class TechnicalFrictionCategory(BaseModel):
    id: int
    name: str
    severity: str
    activeIssues: int
    affectedDevices: str
    avgResolutionTime: str
    issues: list[TechnicalFrictionIssue]


class TechnicalFrictionSeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class TechnicalFrictionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    categories: list[TechnicalFrictionCategory] = Field(default_factory=list)
    severityCounts: TechnicalFrictionSeverityCounts = Field(
        default_factory=TechnicalFrictionSeverityCounts,
    )
    meta: dict[str, Any] = Field(default_factory=dict)


# ── Service Draft ─────────────────────────────────────────────────────


class ServiceDraftPodRole(BaseModel):
    title: str
    focus: str


class ServiceDraftTechnicalLayer(BaseModel):
    issue_id: str
    title: str
    category: str
    bug_category: str | None = None
    severity: str
    impact: int
    confidence: int
    trend: str
    retention_impact: str
    technical_signals: list[str] = Field(default_factory=list)
    recommendation: str
    source_url: str | None = None
    last_updated: str


class ServiceDraftStudioMapping(BaseModel):
    studio_name: str
    studio_focus: str
    rationale: str


class ServiceDraftBusinessValue(BaseModel):
    revenue_shrinkage_usd: int
    revenue_shrinkage_label: str
    operational_risk_score: int
    operational_risk_label: str
    opportunity_estimate_usd: int
    opportunity_label: str
    commercial_justification: str


class ServiceDraftRoi(BaseModel):
    economic_impact: str
    risk_mitigated: str
    potential_value: str
    justification: str


class ServiceDraftRequest(BaseModel):
    analyzed_post_id: int = Field(..., ge=1)
    source: str = Field(
        default="technical_friction",
        description="technical_friction | analytics_insight",
    )


class ServiceDraftResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    analyzed_post_id: int
    source: str
    generated_at: str
    status: str
    technical: ServiceDraftTechnicalLayer
    studio_mapping: ServiceDraftStudioMapping
    business_value: ServiceDraftBusinessValue
    executive_summary: str
    technical_impact: str
    business_impact: str
    suggested_pod: list[ServiceDraftPodRole] = Field(default_factory=list)
    roi: ServiceDraftRoi
    editable_draft: str
    meta: dict[str, Any] = Field(default_factory=dict)
