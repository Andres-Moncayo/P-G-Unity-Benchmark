"""Service Draft generation from analyzed_posts (3-layer intelligence)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.metrics.analytics_insights_service import (
    _build_recommendation,
    _business_category_label,
    _compute_confidence,
    _compute_impact,
    _compute_trend,
    _effective_severity,
)
from app.modules.metrics.analyzed_post_model import AnalyzedPost
from app.modules.metrics.service_draft_studio_mapping import (
    StudioMatch,
    resolve_globant_studio,
)

_REVENUE_IMPACT_MULT = {
    "estimated_high": 1.0,
    "estimated_medium": 0.55,
    "estimated_low": 0.25,
}

_SEVERITY_RISK = {
    "critical": 1.0,
    "high": 0.72,
    "medium": 0.45,
    "low": 0.2,
}

_POD_TEMPLATES: dict[str, list[dict[str, str]]] = {
    "Game Engineering Studio": [
        {"title": "Tech Lead", "focus": "Architecture & delivery governance"},
        {"title": "Rendering Engineer", "focus": "GPU / pipeline stabilization"},
        {"title": "QA Specialist", "focus": "Regression & device matrix"},
        {"title": "DevOps", "focus": "Build & release hardening"},
        {"title": "AI Analyst", "focus": "Telemetry & anomaly detection"},
    ],
    "Mobile Engineering Studio": [
        {"title": "Mobile Tech Lead", "focus": "Platform strategy"},
        {"title": "Android/iOS Engineer", "focus": "Runtime & permissions"},
        {"title": "QA Specialist", "focus": "Device lab coverage"},
        {"title": "DevOps", "focus": "Mobile CI/CD"},
        {"title": "Product Analyst", "focus": "Store & crash analytics"},
    ],
    "AI Studio": [
        {"title": "AI Tech Lead", "focus": "Model lifecycle"},
        {"title": "ML Engineer", "focus": "Inference & training pipelines"},
        {"title": "MLOps", "focus": "Deployment & monitoring"},
        {"title": "Data Engineer", "focus": "Feature stores"},
        {"title": "Solutions Architect", "focus": "Unity integration"},
    ],
    "Cloud Ops Studio": [
        {"title": "Cloud Architect", "focus": "Infra design"},
        {"title": "DevOps Lead", "focus": "Pipelines & SRE"},
        {"title": "Build Engineer", "focus": "Artifact & cache optimization"},
        {"title": "QA Specialist", "focus": "Release validation"},
        {"title": "FinOps Analyst", "focus": "Cloud cost control"},
    ],
}

_DEFAULT_POD = _POD_TEMPLATES["Game Engineering Studio"]


def _format_dt(value: datetime | None) -> str:
    if not value:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return value.strftime("%Y-%m-%d %H:%M UTC")


def _technical_signals(post: AnalyzedPost) -> list[str]:
    signals: list[str] = []
    if post.bug_category:
        signals.append(f"Category: {post.bug_category}")
    if post.platform_mentioned:
        signals.append(f"Platform: {post.platform_mentioned}")
    if post.unity_version:
        signals.append(f"Unity version: {post.unity_version}")
    if post.affected_platforms:
        signals.append(f"Affected: {', '.join(post.affected_platforms[:4])}")
    if post.alert_type:
        signals.append(f"Alert type: {post.alert_type}")
    if post.industry_trend:
        signals.append(f"Industry trend: {post.industry_trend}")
    if post.alert_reach:
        signals.append(f"Reach: {post.alert_reach:,} devices/sessions (est.)")
    if post.churn_risk:
        signals.append(f"Churn risk: {post.churn_risk}")
    return signals[:8]


def _retention_impact_label(post: AnalyzedPost, severity: str) -> str:
    churn = (post.churn_risk or "medium").lower()
    prob = post.churn_probability
    prob_pct = f"{prob * 100:.0f}%" if prob is not None else "n/a"
    base = {
        "critical": "High retention exposure",
        "high": "Elevated retention risk",
        "medium": "Moderate retention pressure",
        "low": "Limited retention impact",
    }.get(severity, "Retention impact under review")
    return f"{base} · segment risk {churn} · churn probability {prob_pct}"


def _business_value_layer(post: AnalyzedPost, severity: str, impact: int) -> dict[str, Any]:
    reach = post.alert_reach or 0
    influence = post.alert_influence_score or 0.5
    churn_prob = post.churn_probability or 0.35
    rev_mult = _REVENUE_IMPACT_MULT.get(post.revenue_impact or "", 0.4)
    sev_mult = _SEVERITY_RISK.get(severity, 0.45)

    # Heuristic ARPU proxy (USD) — documented in response meta, not stored in DB.
    arpu_proxy = 12.0
    affected_units = max(reach, int(500 + influence * 2000))
    shrinkage = affected_units * arpu_proxy * churn_prob * rev_mult * sev_mult
    shrinkage = round(max(15_000, min(shrinkage, 2_500_000)))

    opportunity = round(shrinkage * (1.15 + influence * 0.35))
    risk_score = min(100, int(impact * 0.6 + churn_prob * 40 + sev_mult * 20))

    return {
        "revenue_shrinkage_usd": shrinkage,
        "revenue_shrinkage_label": f"${shrinkage:,.0f} estimated quarterly exposure",
        "operational_risk_score": risk_score,
        "operational_risk_label": (
            "Critical operational risk" if risk_score >= 75 else "Elevated operational risk"
            if risk_score >= 50
            else "Manageable operational risk"
        ),
        "opportunity_estimate_usd": opportunity,
        "opportunity_label": f"${opportunity:,.0f} recoverable value (12–18 mo horizon)",
        "commercial_justification": (
            f"Addressing this {severity} signal protects an estimated "
            f"${shrinkage:,.0f} in revenue at risk while unlocking "
            f"${opportunity:,.0f} in retention-led expansion through a focused Globant pod."
        ),
    }


def _suggested_pod(studio: StudioMatch) -> list[dict[str, str]]:
    return list(_POD_TEMPLATES.get(studio.studio_name, _DEFAULT_POD))


def _build_executive_summary(
    post: AnalyzedPost,
    severity: str,
    category_label: str,
    studio: StudioMatch,
    business: dict[str, Any],
) -> str:
    title = post.title or "Technical friction signal"
    return (
        f"Unity faces a {severity.upper()} signal in {category_label}: «{title}». "
        f"Recommended response via {studio.studio_name} to stabilize the technical baseline "
        f"and mitigate {business['revenue_shrinkage_label'].lower()}. "
        f"{studio.rationale}"
    )


def _build_technical_impact(post: AnalyzedPost, signals: list[str], impact: int) -> str:
    summary = post.summary or "No extended summary in analyzed_posts."
    signal_block = "; ".join(signals) if signals else "Limited structured signals."
    return (
        f"{summary} "
        f"Model impact score: {impact}/100. Key telemetry: {signal_block}."
    )


def _build_business_impact(post: AnalyzedPost, business: dict[str, Any], recommendation: str) -> str:
    return (
        f"{business['commercial_justification']} "
        f"Operational assessment: {business['operational_risk_label']} "
        f"(score {business['operational_risk_score']}/100). "
        f"Strategic recommendation: {recommendation}"
    )


def _compose_editable_draft(
    *,
    executive_summary: str,
    technical_impact: str,
    business_impact: str,
    studio: StudioMatch,
    pod: list[dict[str, str]],
    business: dict[str, Any],
    roi: dict[str, Any],
) -> str:
    pod_lines = "\n".join(f"  • {r['title']} — {r['focus']}" for r in pod)
    return "\n".join(
        [
            "SERVICE DRAFT — GLOBANT × UNITY",
            "",
            "RESUMEN EJECUTIVO",
            executive_summary,
            "",
            "IMPACTO TÉCNICO",
            technical_impact,
            "",
            "IMPACTO DE NEGOCIO",
            business_impact,
            "",
            f"POD SUGERIDO — {studio.studio_name.upper()}",
            pod_lines,
            "",
            "ESTIMACIÓN ROI",
            f"  • Impacto económico: {roi['economic_impact']}",
            f"  • Riesgo mitigado: {roi['risk_mitigated']}",
            f"  • Valor potencial: {roi['potential_value']}",
            f"  • Justificación: {roi['justification']}",
            "",
        ]
    )


def generate_service_draft(
    db: Session,
    *,
    analyzed_post_id: int,
    source: str = "technical_friction",
) -> dict[str, Any]:
    post = db.execute(
        select(AnalyzedPost).where(AnalyzedPost.id == analyzed_post_id)
    ).scalar_one_or_none()
    if post is None:
        raise ValueError(f"analyzed_post {analyzed_post_id} not found")

    severity = _effective_severity(post)
    category_label = _business_category_label(post.business_category)
    impact = _compute_impact(post, severity)
    confidence = _compute_confidence(post)
    trend = _compute_trend(post)
    recommendation = _build_recommendation(post, severity)
    studio = resolve_globant_studio(
        bug_category=post.bug_category,
        business_category=post.business_category,
        alert_type=post.alert_type,
        title=post.title,
        summary=post.summary,
    )
    signals = _technical_signals(post)
    business = _business_value_layer(post, severity, impact)
    pod = _suggested_pod(studio)

    executive_summary = _build_executive_summary(
        post, severity, category_label, studio, business
    )
    technical_impact = _build_technical_impact(post, signals, impact)
    business_impact = _build_business_impact(post, business, recommendation)

    roi = {
        "economic_impact": business["revenue_shrinkage_label"],
        "risk_mitigated": business["operational_risk_label"],
        "potential_value": business["opportunity_label"],
        "justification": (
            f"Engagement with {studio.studio_name} targets {impact}/100 technical impact "
            f"with {confidence}% model confidence and {trend} trend direction."
        ),
    }

    editable = _compose_editable_draft(
        executive_summary=executive_summary,
        technical_impact=technical_impact,
        business_impact=business_impact,
        studio=studio,
        pod=pod,
        business=business,
        roi=roi,
    )

    return {
        "draft_id": str(uuid.uuid4()),
        "analyzed_post_id": post.id,
        "source": source,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "draft",
        "technical": {
            "issue_id": str(post.id),
            "title": post.title or "Issue reported",
            "category": category_label,
            "bug_category": post.bug_category,
            "severity": severity,
            "impact": impact,
            "confidence": confidence,
            "trend": trend,
            "retention_impact": _retention_impact_label(post, severity),
            "technical_signals": signals,
            "recommendation": recommendation,
            "source_url": post.url,
            "last_updated": _format_dt(post.date_post),
        },
        "studio_mapping": {
            "studio_name": studio.studio_name,
            "studio_focus": studio.studio_focus,
            "rationale": studio.rationale,
        },
        "business_value": business,
        "executive_summary": executive_summary,
        "technical_impact": technical_impact,
        "business_impact": business_impact,
        "suggested_pod": pod,
        "roi": roi,
        "editable_draft": editable,
        "meta": {
            "data_source": "analyzed_posts",
            "calculation_note": (
                "Revenue and opportunity figures are heuristic estimates derived from "
                "alert_reach, influence_score, churn_probability, and revenue_impact enums."
            ),
        },
    }
