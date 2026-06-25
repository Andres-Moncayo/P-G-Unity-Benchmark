"""Normalize post rows (flat DB, legacy, or nested JSON) into analytics-internal dicts.

Target contract (canonical JSON for LLM / API consumers) is documented in
`manuals/ANALYTICS_JSON_SCHEMA_DELTA.md`. Aggregations only depend on the
flat keys produced by `to_analytics_row()` — charts keep working when new
nested fields are added.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

_DIMS = ("performance", "crash", "ui", "api", "documentation")

_BUSINESS_CATEGORY_TO_PILLAR: dict[str, str | None] = {
    "": None,
    "general": None,
    "all": None,
    "producto": "product",
    "product": "product",
    "finanzas": "finance",
    "finance": "finance",
    "ecosistema": "ecosystem",
    "ecosystem": "ecosystem",
    "posicionamiento": "positioning",
    "positioning": "positioning",
}


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _norm_platform(raw: str | None) -> str:
    p = (raw or "").strip().lower()
    if not p:
        return "others"
    if "unity" in p:
        return "unity"
    if "unreal" in p:
        return "unreal"
    if "godot" in p:
        return "godot"
    return "others"


def _bug_category_from_bug(bug: str | None) -> str:
    if not bug:
        return ""
    b = str(bug).lower()
    for dim in _DIMS:
        if dim in b:
            return dim
    return ""


def _sentiment_score_from_promoter(promotor: int, detractor: int) -> float:
    return max(-1.0, min(1.0, (float(promotor) - float(detractor)) / 10.0))


def _parse_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if value is None:
        return datetime.now(timezone.utc)
    s = str(value).strip()
    if not s:
        return datetime.now(timezone.utc)
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%b %Y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(s.replace("Z", "+0000"), fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def _coerce_churn_probability(item: dict[str, Any], business_metrics: dict[str, Any]) -> float | None:
    cp = business_metrics.get("churn_probability")
    if cp is None:
        cp = item.get("churn_probability")
    if cp is None and item.get("churn_percentage") is not None:
        raw = float(item["churn_percentage"])
        cp = raw / 100.0 if raw > 1.0 else raw
    if cp is None:
        return None
    return max(0.0, min(1.0, float(cp)))


def _coerce_bool_churn_risk(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    s = str(value).strip().lower()
    return s in ("1", "true", "yes", "y", "high", "medium")


def _severity_from_parts(
    *,
    technical: dict[str, Any],
    alert: dict[str, Any],
    performance: str | None,
    alert_type: str | None,
) -> str:
    sev = (technical.get("severity") or alert.get("urgency") or "").strip().lower()
    if sev in ("low", "medium", "high", "critical"):
        return "critical" if sev == "critical" else sev
    perf = (performance or "").strip().lower()
    if perf == "high":
        return "high"
    if perf == "low":
        return "low"
    alt = (alert_type or alert.get("type") or "").strip().lower()
    if alt in ("high", "critical"):
        return "high"
    if alt == "middle":
        return "medium"
    if alt == "medium":
        return "medium"
    return "low"


def merge_nested_document(item: dict[str, Any]) -> dict[str, Any]:
    """If `metadata` / `post_metadata` holds the full nested JSON, merge it with row columns."""
    out = dict(item)
    meta = out.get("post_metadata") or out.get("metadata")
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except json.JSONDecodeError:
            meta = {}
    if not isinstance(meta, dict):
        meta = {}
    nested = meta.get("document") if isinstance(meta.get("document"), dict) else meta
    if isinstance(nested, dict) and (
        isinstance(nested.get("sentiment"), dict)
        or isinstance(nested.get("source"), dict)
        or isinstance(nested.get("technical_analysis"), dict)
    ):
        for key, val in nested.items():
            if key not in out or out[key] in (None, "", {}, []):
                out[key] = val
        out.setdefault("metadata", meta)
    elif meta:
        out.setdefault("metadata", meta)
    return out


def business_category_to_pillar(raw: str | None) -> str | None:
    if raw is None:
        return None
    k = str(raw).strip().lower()
    if not k:
        return None
    return _BUSINESS_CATEGORY_TO_PILLAR.get(k, k if k in ("product", "finance", "ecosystem", "positioning") else None)


def to_analytics_row(item: dict[str, Any]) -> dict[str, Any]:
    """Map canonical / flat / legacy post dict → keys used by posts_aggregate."""
    doc = merge_nested_document(item)

    source = _as_dict(doc.get("source"))
    engagement = _as_dict(source.get("engagement"))
    sentiment = _as_dict(doc.get("sentiment"))
    technical = _as_dict(doc.get("technical_analysis"))
    business_metrics = _as_dict(doc.get("business_metrics"))
    nps = _as_dict(doc.get("nps_indicators"))
    alert = _as_dict(doc.get("alert_metadata"))
    meta = _as_dict(doc.get("metadata"))

    dt = _parse_date(doc.get("date") or doc.get("date_post") or doc.get("created_at"))

    engine_raw = doc.get("platform_mentioned") or meta.get("platform_mentioned")
    platform = _norm_platform(str(engine_raw) if engine_raw is not None else None)

    raw_label = sentiment.get("label") or doc.get("sentiment_label") or doc.get("sentimental")
    if raw_label is None:
        raw_sent = doc.get("sentiment")
        raw_label = raw_sent if isinstance(raw_sent, str) else "neutral"
    sentiment_label = str(raw_label or "neutral").strip().lower()

    sentiment_score = sentiment.get("score")
    if sentiment_score is None and doc.get("sentiment_score") is not None:
        sentiment_score = float(doc["sentiment_score"])

    upvotes = int(engagement.get("upvotes") if engagement.get("upvotes") is not None else doc.get("upvotes") or 0)
    comments = int(engagement.get("comments") if engagement.get("comments") is not None else doc.get("comments") or 0)
    shares = int(engagement.get("shares") if engagement.get("shares") is not None else doc.get("shares") or 0)

    # would_recommend is the canonical NPS signal (replaces promotor/detractor).
    # True → promoter, False → detractor, None → no NPS signal.
    would_recommend = nps.get("would_recommend")
    if would_recommend is None:
        would_recommend = doc.get("would_recommend")
    if isinstance(would_recommend, str):
        s = would_recommend.strip().lower()
        would_recommend = True if s in ("true", "1", "yes") else False if s in ("false", "0", "no") else None

    # Legacy MVP `posts` table still has promoter/detractor counters — only used
    # to fill would_recommend if the new column is null and counters exist.
    legacy_promoter = doc.get("promoter") if doc.get("promoter") is not None else doc.get("promotor")
    legacy_detractor = doc.get("detractor")
    if would_recommend is None and legacy_promoter is not None and legacy_detractor is not None:
        if int(legacy_promoter or 0) + int(legacy_detractor or 0) > 0:
            would_recommend = int(legacy_promoter) > int(legacy_detractor)

    if sentiment_score is not None:
        sentiment_score = max(-1.0, min(1.0, float(sentiment_score)))
    elif would_recommend is True:
        sentiment_score = 1.0
    elif would_recommend is False:
        sentiment_score = -1.0

    bug_raw = technical.get("bug_category") or doc.get("bug_category") or doc.get("bug")
    bug_category = _bug_category_from_bug(str(bug_raw) if bug_raw else None) or (
        str(bug_raw).lower() if bug_raw and str(bug_raw).lower() in _DIMS else ""
    )

    alert_type = str(alert.get("type") or doc.get("alert_type") or "low").strip().lower()
    severity = _severity_from_parts(
        technical=technical,
        alert=alert,
        performance=doc.get("performance"),
        alert_type=alert_type,
    )

    churn_probability = _coerce_churn_probability(doc, business_metrics)
    churn_risk_val = business_metrics.get("churn_risk")
    if churn_risk_val is None:
        churn_risk_val = doc.get("churn_risk")
    churn_risk = _coerce_bool_churn_risk(churn_risk_val)

    business_category = (
        doc.get("business_category")
        or meta.get("business_category")
        or meta.get("strategic_pillar")
        or meta.get("pillar")
        or meta.get("business_theme")
    )
    if business_category is not None:
        business_category = str(business_category).strip().lower()

    strength = nps.get("sentiment_strength")
    if strength is None:
        strength = sentiment_score

    title = str(doc.get("title") or "")
    summary = str(doc.get("summary") or "")

    return {
        "dt": dt,
        "platform": platform,
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "bug_category": bug_category,
        "severity": severity,
        "alert_type": alert_type,
        "alert_urgency": str(alert.get("urgency") or doc.get("alert_urgency") or alert_type).strip().lower(),
        "churn_probability": churn_probability,
        "would_recommend": would_recommend,
        "sentiment_strength": strength,
        "upvotes": upvotes,
        "comments": comments,
        "shares": shares,
        "has_promotor_signal": would_recommend is not None or sentiment_score is not None,
        "churn_risk": churn_risk,
        "title": title.strip().lower(),
        "summary_text": summary.strip().lower(),
        "business_category": business_category,
        "metadata": meta,
    }


def orm_post_to_dict(post: Any) -> dict[str, Any]:
    """Build a dict from SQLAlchemy Post / row-like object."""
    meta = getattr(post, "post_metadata", None) or getattr(post, "metadata", None) or {}
    if not isinstance(meta, dict):
        meta = {}
    return {
        "id": getattr(post, "id", None),
        "title": getattr(post, "title", ""),
        "summary": getattr(post, "summary", ""),
        "url": getattr(post, "url", None),
        "date": getattr(post, "date", None),
        "created_at": getattr(post, "created_at", None),
        "platform_mentioned": meta.get("platform_mentioned"),
        "sentiment": getattr(post, "sentiment", "neutral"),
        "bug": getattr(post, "bug", None),
        "performance": getattr(post, "performance", None),
        "churn_risk": getattr(post, "churn_risk", False),
        "churn_percentage": getattr(post, "churn_percentage", None),
        "would_recommend": getattr(post, "would_recommend", None),
        "promoter": getattr(post, "promoter", None),
        "detractor": getattr(post, "detractor", None),
        "alert_type": getattr(post, "alert_type", "low"),
        "metadata": meta,
        "post_metadata": meta,
    }


def orm_legacy_analyzed_to_dict(row: Any) -> dict[str, Any]:
    """Build a dict from analytics legacy AnalyzedPost ORM model."""
    return {
        "id": row.id,
        "title": row.title,
        "summary": row.summary,
        "url": row.url,
        "date_post": row.date_post,
        "created_at": row.created_at,
        "platform_mentioned": getattr(row, "platform_mentioned", None),
        "sentimental": row.sentimental,
        "bug": row.bug,
        "performance": row.performance,
        "churn_risk": row.churn_risk,
        "churn_percentage": row.churn_percentage,
        "would_recommend": getattr(row, "would_recommend", None),
        "promoter": getattr(row, "promotor", None),
        "detractor": getattr(row, "detractor", None),
        "alert_type": row.alert_type,
        "metadata": {},
    }
