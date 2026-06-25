"""CRUD de monitorization: acceso a datos y fallbacks seguros.

Provee funciones que intentan usar el modelo `Post` (tabla `posts`).
Si la tabla no existe en la base de datos destino, se realiza un fallback
consultando la tabla `analyzed_posts` detectando dinámicamente las
columnas disponibles para evitar errores de columna inexistente.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, text
from sqlalchemy.orm import Session

from app.modules.market_intelligence.models import Post
from app.modules.analytics.posts_aggregate import (
    filter_posts_for_strategic_pillar,
    normalize_business_query,
)
from app.modules.monitorization.schemas import (
	MonitorizationPostDetailResponse,
	SourceObject,
	SentimentObject,
	TechnicalAnalysis,
	BusinessMetrics,
	CompetitiveIntelligence,
	NPSIndicators,
	MarketSignals,
	AlertMetadata,
)
from app.services.search import SearchService

BUSINESS_CATEGORIES = (
    "general",
    "product",
    "finance",
    "ecosystem",
    "positioning",
)


def _read_value(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]





def _serialize_monitorization_post(item: Any) -> dict[str, Any]:
    """Normaliza un post al shape que consume el frontend y añade categoría de negocio."""
    source_platform = _read_value(item, "source_platform", _read_value(item, "platform")) or "unknown"
    source_subreddit = _read_value(item, "source_subreddit")
    source_author = _read_value(item, "source_author")
    upvotes = _read_value(item, "upvotes", _read_value(item, "promoter", 0))
    comments = _read_value(item, "comments", 0)
    shares = _read_value(item, "shares", 0)

    sentiment_label = _read_value(
        item,
        "sentiment_label",
        _read_value(item, "sentiment", _read_value(item, "sentimental", "neutral")),
    )
    sentiment_score = _read_value(item, "sentiment_score")
    if sentiment_score is None:
        label_text = str(sentiment_label).lower()
        if "pos" in label_text:
            sentiment_score = 0.7
        elif "neg" in label_text:
            sentiment_score = -0.7
        else:
            sentiment_score = 0.0

    payload = {
        "id": _read_value(item, "id"),
        "title": _read_value(item, "title"),
        "summary": _read_value(item, "summary"),
        "url": _read_value(item, "url"),
        "date": _read_value(item, "date", _read_value(item, "date_post", _read_value(item, "created_at"))),
        "platform": source_platform,
        "source_platform": source_platform,
        "platform_mentioned": _read_value(item, "platform_mentioned", "unity"),
        "source_subreddit": source_subreddit,
        "source_author": source_author,
        "upvotes": upvotes,
        "comments": comments,
        "shares": shares,
        "sentiment": sentiment_label,
        "sentiment_label": sentiment_label,
        "sentiment_score": sentiment_score,
        "sentiment_confidence": _read_value(item, "sentiment_confidence", 0.8),
        "bug": _read_value(item, "bug_category", _read_value(item, "bug")),
        "bug_category": _read_value(item, "bug_category", _read_value(item, "bug")),
        "performance": _read_value(item, "performance", _read_value(item, "performance_status")),
        "churn_risk": _read_value(item, "churn_risk", False),
        "churn_probability": _read_value(item, "churn_probability", _read_value(item, "churn_percentage")),
        "churn_percentage": _read_value(item, "churn_percentage", _read_value(item, "churn_probability")),
        "promoter": upvotes,
        "detractor": _read_value(item, "detractor", 0),
        "revenue_impact": _read_value(item, "revenue_impact"),
        "user_segment": _read_value(item, "user_segment"),
        "competitor_mentioned": _read_value(item, "competitor_mentioned"),
        "comparison_type": _read_value(item, "comparison_type"),
        "migration_intent": _read_value(item, "migration_intent"),
        "sentiment_strength": _read_value(item, "sentiment_strength"),
        "would_recommend": _read_value(item, "would_recommend"),
        "key_factors": _as_list(_read_value(item, "key_factors", [])),
        "industry_trend": _read_value(item, "industry_trend"),
        "adoption_stage": _read_value(item, "adoption_stage"),
        "company_size": _read_value(item, "company_size"),
        "geographic_region": _read_value(item, "geographic_region"),
        "alert_type": _read_value(item, "alert_type", "low"),
        "alert_urgency": _read_value(item, "alert_urgency", _read_value(item, "alert_type", "low")),
        "alert_reach": _read_value(item, "alert_reach"),
        "alert_influence_score": _read_value(item, "alert_influence_score"),
        "created_at": _read_value(item, "created_at"),
        "business_category": str(_read_value(item, "business_category", "general")).lower(),
    }
    metadata = _read_value(item, "post_metadata", _read_value(item, "metadata", None))
    if metadata is not None:
        payload["post_metadata"] = metadata
    return payload


def _analyzed_posts_columns(db: Session) -> set[str]:
    """Devuelve el set de columnas de la tabla `analyzed_posts` si existe."""
    try:
        rows = db.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='analyzed_posts'")
        ).fetchall()
        return {r[0] for r in rows}
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return set()


def _analyzed_posts_select_parts(cols: set[str]) -> dict[str, str]:
    created_at_expr = "created_at" if "created_at" in cols else "NULL::timestamp"
    date_expr = f"COALESCE(date_post, {created_at_expr})" if "date_post" in cols else created_at_expr
    source_platform_expr = "source_platform" if "source_platform" in cols else ("platform" if "platform" in cols else "NULL")
    sentiment_label_expr = "sentiment_label" if "sentiment_label" in cols else ("sentiment" if "sentiment" in cols else ("sentimental" if "sentimental" in cols else "'neutral'"))
    bug_category_expr = "bug_category" if "bug_category" in cols else ("bug" if "bug" in cols else "NULL")
    upvotes_expr = "upvotes" if "upvotes" in cols else ("promoter" if "promoter" in cols else ("promotor" if "promotor" in cols else "0"))
    churn_prob_expr = "churn_probability" if "churn_probability" in cols else ("churn_percentage" if "churn_percentage" in cols else "NULL")
    churn_pct_expr = "churn_percentage" if "churn_percentage" in cols else ("churn_probability" if "churn_probability" in cols else "NULL")

    select_list = f"""
        id, title, summary, url,
        {date_expr} AS date,
        {source_platform_expr} AS source_platform,
        {upvotes_expr} AS upvotes,
        {('comments' if 'comments' in cols else '0')} AS comments,
        {('shares' if 'shares' in cols else '0')} AS shares,
        {sentiment_label_expr} AS sentiment_label,
        {('sentiment_score' if 'sentiment_score' in cols else 'NULL')} AS sentiment_score,
        {('sentiment_confidence' if 'sentiment_confidence' in cols else 'NULL')} AS sentiment_confidence,
        {('platform_mentioned' if 'platform_mentioned' in cols else "'unity'")} AS platform_mentioned,
        {bug_category_expr} AS bug_category,
        {('churn_risk' if 'churn_risk' in cols else 'NULL')} AS churn_risk,
        {churn_prob_expr} AS churn_probability,
        {churn_pct_expr} AS churn_percentage,
        {('detractor' if 'detractor' in cols else '0')} AS detractor,
        {('alert_type' if 'alert_type' in cols else "'low'")} AS alert_type,
        {('business_category' if 'business_category' in cols else "'general'")} AS business_category,
        {created_at_expr} AS created_at
    """

    return {
        "select_list": select_list,
        "sentiment_col": "sentiment_label" if "sentiment_label" in cols else ("sentiment" if "sentiment" in cols else ("sentimental" if "sentimental" in cols else "")),
        "platform_col": "source_platform" if "source_platform" in cols else ("platform" if "platform" in cols else ""),
        "bug_col": "bug_category" if "bug_category" in cols else ("bug" if "bug" in cols else ""),
    }


def _normalize_row(row: dict, cols: set[str]) -> dict:
    """Convierte una fila de analyzed_posts a la forma esperada por el router."""
    r = dict(row)
    out: dict = {}
    out["id"] = r.get("id")
    out["title"] = r.get("title")
    out["summary"] = r.get("summary")
    out["url"] = r.get("url")
    out["date"] = r.get("date") or r.get("date_post") or r.get("created_at")
    out["platform"] = r.get("source_platform") or r.get("platform")
    out["source_platform"] = out["platform"]
    out["platform_mentioned"] = r.get("platform_mentioned") or "unity"
    out["source_subreddit"] = r.get("source_subreddit")
    out["source_author"] = r.get("source_author")
    out["upvotes"] = r.get("upvotes", r.get("promoter", 0))
    out["comments"] = r.get("comments", 0)
    out["shares"] = r.get("shares", 0)
    out["sentiment_label"] = r.get("sentiment_label") or r.get("sentiment") or r.get("sentimental") or "neutral"
    out["sentiment"] = out["sentiment_label"]
    out["sentiment_score"] = r.get("sentiment_score")
    out["sentiment_confidence"] = r.get("sentiment_confidence")
    out["bug_category"] = r.get("bug_category") or r.get("bug")
    out["bug"] = out["bug_category"]
    out["severity"] = r.get("severity")
    out["unity_version"] = r.get("unity_version")
    out["affected_platforms"] = r.get("affected_platforms") or []
    cr = r.get("churn_risk")
    out["churn_risk"] = cr if isinstance(cr, bool) else str(cr).lower() in ("1", "true", "yes", "y") if cr is not None else False
    out["churn_probability"] = r.get("churn_probability")
    out["churn_percentage"] = r.get("churn_percentage") or r.get("churn_probability")
    out["revenue_impact"] = r.get("revenue_impact")
    out["user_segment"] = r.get("user_segment")
    out["competitor_mentioned"] = r.get("competitor_mentioned")
    out["comparison_type"] = r.get("comparison_type")
    out["migration_intent"] = r.get("migration_intent")
    out["sentiment_strength"] = r.get("sentiment_strength")
    out["would_recommend"] = r.get("would_recommend")
    out["key_factors"] = r.get("key_factors") or []
    out["industry_trend"] = r.get("industry_trend")
    out["adoption_stage"] = r.get("adoption_stage")
    out["company_size"] = r.get("company_size")
    out["geographic_region"] = r.get("geographic_region")
    out["alert_type"] = r.get("alert_type") or "low"
    out["alert_urgency"] = r.get("alert_urgency") or r.get("alert_type") or "low"
    out["alert_reach"] = r.get("alert_reach")
    out["alert_influence_score"] = r.get("alert_influence_score")
    out["created_at"] = r.get("created_at")
    out["business_category"] = r.get("business_category") or "general"
    out["source"] = {
        "platform": out["source_platform"],
        "subreddit": out["source_subreddit"],
        "author": out["source_author"],
        "engagement": {"upvotes": out["upvotes"], "comments": out["comments"], "shares": out["shares"]},
    }
    out["technical_analysis"] = {
        "bug_category": out["bug_category"],
        "severity": out["severity"],
        "unity_version": out["unity_version"],
        "affected_platforms": out["affected_platforms"],
    }
    out["business_metrics"] = {
        "churn_risk": out["churn_risk"],
        "churn_probability": out["churn_probability"],
        "revenue_impact": out["revenue_impact"],
        "user_segment": out["user_segment"],
    }
    out["competitive_intelligence"] = {
        "competitor_mentioned": out["competitor_mentioned"],
        "comparison_type": out["comparison_type"],
        "migration_intent": out["migration_intent"],
    }
    out["nps_indicators"] = {
        "sentiment_strength": out["sentiment_strength"],
        "would_recommend": out["would_recommend"],
        "key_factors": out["key_factors"],
    }
    out["market_signals"] = {
        "industry_trend": out["industry_trend"],
        "adoption_stage": out["adoption_stage"],
        "company_size": out["company_size"],
        "geographic_region": out["geographic_region"],
    }
    out["alert_metadata"] = {
        "type": out["alert_type"],
        "urgency": out["alert_urgency"],
        "reach": out["alert_reach"],
        "influence_score": out["alert_influence_score"],
    }
    out["post_metadata"] = r.get("metadata") or r.get("post_metadata")
    return out


def _row_for_business_filter(row: dict[str, Any]) -> dict[str, Any]:
    """Shape mínimo para reutilizar filter_posts_for_strategic_pillar de Analytics."""
    meta = row.get("post_metadata") or row.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    return {
        "business_category": row.get("business_category"),
        "metadata": meta,
        "bug_category": row.get("bug_category") or row.get("bug"),
        "churn_risk": row.get("churn_risk"),
        "churn_probability": row.get("churn_probability"),
        "sentiment_label": row.get("sentiment_label") or row.get("sentiment"),
        "title": row.get("title"),
        "summary_text": row.get("summary"),
    }


def _apply_business_filter(
    posts: list[Any],
    business: str | None,
) -> list[Any]:
    pillar = normalize_business_query(business)
    if pillar is None:
        return posts
    filtered: list[Any] = []
    for post in posts:
        shaped = _row_for_business_filter(post if isinstance(post, dict) else dict(post))
        if filter_posts_for_strategic_pillar([shaped], business):
            filtered.append(post)
    return filtered


def list_monitorization_posts(
    db: Session,
    *,
    sentiment: str | None = None,
    platform: str | None = None,
    bug: str | None = None,
    business: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Any]:
    """Lista posts con filtros y paginación; usa fallback a `analyzed_posts`.

    Sentencias SQL optimizadas: trae solo columnas necesarias, filtra en WHERE.
    """
    needs_business_filter = normalize_business_query(business) is not None
    fetch_skip = 0 if needs_business_filter else skip
    fetch_limit = min(max(limit * 20, 200), 1000) if needs_business_filter else limit

    cols = _analyzed_posts_columns(db)
    if cols:
        try:
            parts = _analyzed_posts_select_parts(cols)
            sql = f"""
                SELECT {parts['select_list']}
                FROM analyzed_posts
                WHERE 1=1
            """
            params: dict[str, object] = {}

            # Agregar filtros directamente en WHERE
            if sentiment and parts["sentiment_col"]:
                sql += f" AND {parts['sentiment_col']} = :sentiment"
                params["sentiment"] = sentiment
            if platform and parts["platform_col"]:
                sql += f" AND {parts['platform_col']} = :platform"
                params["platform"] = platform
            if bug and parts["bug_col"]:
                sql += f" AND {parts['bug_col']} = :bug"
                params["bug"] = bug

            order_expr = "date_post" if "date_post" in cols else ("created_at" if "created_at" in cols else "id")
            sql += f" ORDER BY {order_expr} DESC LIMIT :limit OFFSET :offset"
            params["limit"] = fetch_limit
            params["offset"] = fetch_skip

            res = db.execute(text(sql), params)
            rows = [_serialize_monitorization_post(r._mapping) for r in res]
            if needs_business_filter:
                rows = _apply_business_filter(rows, business)
                return rows[skip : skip + limit]
            return rows
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    try:
        q = db.query(
            Post.id,
            Post.title,
            Post.summary,
            Post.url,
            Post.date,
            Post.platform,
            Post.sentiment,
            Post.bug,
            Post.churn_risk,
            Post.churn_percentage,
            Post.promoter,
            Post.detractor,
            Post.alert_type,
            Post.post_metadata,
        )
        if sentiment:
            q = q.filter(Post.sentiment == sentiment)
        if platform:
            q = q.filter(Post.platform == platform)
        if bug:
            q = q.filter(Post.bug == bug)
        # Order by date descending so the most recent posts come first,
        # and use id as a tiebreaker for stable ordering.
        rows = [_serialize_monitorization_post(row._mapping) for row in q.order_by(Post.date.desc(), Post.id.desc()).offset(fetch_skip).limit(fetch_limit).all()]
        if needs_business_filter:
            rows = _apply_business_filter(rows, business)
            return rows[skip : skip + limit]
        return rows
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return []

def list_business_category_posts(
    db: Session,
    *,
    sentiment: str | None = None,
    platform: str | None = None,
    bug: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Agrupa posts por business_category sin recalcularla."""
    posts = list_monitorization_posts(
        db,
        sentiment=sentiment,
        platform=platform,
        bug=bug,
        skip=skip,
        limit=limit,
    )

    grouped: dict[str, list[dict[str, Any]]] = {cat: [] for cat in BUSINESS_CATEGORIES}
    for post in posts:
        category = str(post.get("business_category") or "general").lower()
        grouped.setdefault(category, []).append(post)

    return [
        {"category": category, "posts": grouped[category]}
        for category in BUSINESS_CATEGORIES
        if grouped.get(category)
    ]

def get_monitorization_post_by_id(db: Session, post_id: int) -> Any | None:
    """Obtiene un post por ID con columnas explícitas."""
    cols = _analyzed_posts_columns(db)
    if cols:
        try:
            parts = _analyzed_posts_select_parts(cols)
            sql = f"""
                SELECT {parts['select_list']}
                FROM analyzed_posts
                WHERE id = :id
            """
            res = db.execute(text(sql), {"id": post_id}).first()
            return _serialize_monitorization_post(res._mapping) if res else None
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass

    try:
        post = (
            db.query(
                Post.id,
                Post.title,
                Post.summary,
                Post.url,
                Post.date,
                Post.platform,
                Post.sentiment,
                Post.bug,
                Post.churn_risk,
                Post.churn_percentage,
                Post.promoter,
                Post.detractor,
                Post.alert_type,
                Post.post_metadata,
            )
            .filter(Post.id == post_id)
            .first()
        )
        if post is not None:
            return _serialize_monitorization_post(post._mapping)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    return None


def list_posts_by_sentiment(db: Session, sentiment: str, *, limit: int = 50) -> list[Any]:
    """Lista posts por sentimiento con fallback seguro."""
    cols = _analyzed_posts_columns(db)
    if cols:
        parts = _analyzed_posts_select_parts(cols)
        sentiment_col = parts["sentiment_col"]
        if sentiment_col:
            try:
                order_expr = "date_post" if "date_post" in cols else ("created_at" if "created_at" in cols else "id")
                sql = f"""
                    SELECT {parts['select_list']}
                    FROM analyzed_posts
                    WHERE {sentiment_col} = :sentiment
                    ORDER BY {order_expr} DESC
                    LIMIT :limit
                """
                res = db.execute(text(sql), {"sentiment": sentiment, "limit": limit})
                return [_serialize_monitorization_post(r._mapping) for r in res]
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass

    try:
        posts = (
            db.query(
                Post.id,
                Post.title,
                Post.summary,
                Post.url,
                Post.date,
                Post.platform,
                Post.sentiment,
                Post.bug,
                Post.churn_risk,
                Post.churn_percentage,
                Post.promoter,
                Post.detractor,
                Post.alert_type,
                Post.post_metadata,
            )
            .filter(Post.sentiment == sentiment)
            .order_by(Post.id.desc())
            .limit(limit)
            .all()
        )
        return [_serialize_monitorization_post(post._mapping) for post in posts]
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return []


def _transform_to_detailed_response(flat_post: dict[str, Any]) -> MonitorizationPostDetailResponse:
    """Transforma un post plano a la estructura compleja anidada con nested objects."""
    # Mapear sentimiento simple a estructura de sentimiento compleja
    sentiment_label = str(flat_post.get("sentiment") or "").lower()
    if "pos" in sentiment_label:
        sentiment_score = 0.7
        sentiment_label = "positive"
    elif "neg" in sentiment_label:
        sentiment_score = -0.7
        sentiment_label = "negative"
    else:
        sentiment_score = 0.0
        sentiment_label = "neutral"

    metadata = flat_post.get("post_metadata", {}) or {}
    platform_mentioned = flat_post.get("platform_mentioned") or "unity"

    # Asegurar que date es un datetime válido
    post_date = flat_post.get("date")
    if post_date is None:
        post_date = datetime.utcnow()
    
    # Calcular churn_probability de forma segura
    churn_pct = flat_post.get("churn_percentage")
    churn_prob = (churn_pct / 100) if (churn_pct is not None and isinstance(churn_pct, (int, float))) else None

    return MonitorizationPostDetailResponse(
        id=str(flat_post.get("id", "")),
        title=flat_post.get("title") or flat_post.get("summary") or flat_post.get("url") or "",
        summary=flat_post.get("summary"),
        url=flat_post.get("url"),
        date=post_date,
        source=SourceObject(
            platform=str(flat_post.get("source_platform") or flat_post.get("platform") or "unknown"),
            subreddit=metadata.get("subreddit"),
            author=metadata.get("author"),
            engagement=metadata.get(
                "engagement",
                {
                    "upvotes": flat_post.get("upvotes", flat_post.get("promoter", 0)),
                    "comments": flat_post.get("comments", 0),
                    "shares": flat_post.get("shares", 0),
                },
            )
        ),
        sentiment=SentimentObject(
            score=sentiment_score,
            label=sentiment_label,
            confidence=flat_post.get("sentiment_confidence", 0.8) or 0.8
        ),
        platform_mentioned=platform_mentioned,
        bug=flat_post.get("bug_category") or flat_post.get("bug"),
        technical_analysis=TechnicalAnalysis(
            bug_category=flat_post.get("bug_category") or flat_post.get("bug"),
            severity=flat_post.get("severity") or _map_alert_to_severity(flat_post.get("alert_type", "low")),
            unity_version=flat_post.get("unity_version") or metadata.get("unity_version"),
            affected_platforms=flat_post.get("affected_platforms") or metadata.get("affected_platforms", [])
        ),
        business_metrics=BusinessMetrics(
            churn_risk=_map_churn_to_risk_level(flat_post.get("churn_risk", False)),
            churn_probability=flat_post.get("churn_probability", churn_prob),
            revenue_impact=flat_post.get("revenue_impact") or metadata.get("revenue_impact"),
            user_segment=flat_post.get("user_segment") or metadata.get("user_segment")
        ),
        competitive_intelligence=CompetitiveIntelligence(
            competitor_mentioned=flat_post.get("competitor_mentioned") or metadata.get("competitor_mentioned"),
            comparison_type=flat_post.get("comparison_type") or metadata.get("comparison_type"),
            migration_intent=flat_post.get("migration_intent") or metadata.get("migration_intent")
        ),
        nps_indicators=NPSIndicators(
            sentiment_strength=flat_post.get("sentiment_strength", (flat_post.get("upvotes", flat_post.get("promoter", 0)) - flat_post.get("detractor", 0)) / 5.0),
            would_recommend=flat_post.get("would_recommend", (flat_post.get("upvotes", flat_post.get("promoter", 0)) - flat_post.get("detractor", 0)) > 0),
            key_factors=flat_post.get("key_factors") or metadata.get("key_factors", [])
        ),
        market_signals=MarketSignals(
            industry_trend=flat_post.get("industry_trend") or metadata.get("industry_trend"),
            adoption_stage=flat_post.get("adoption_stage") or metadata.get("adoption_stage"),
            company_size=flat_post.get("company_size") or metadata.get("company_size"),
            geographic_region=flat_post.get("geographic_region") or metadata.get("geographic_region")
        ),
        alert_metadata=AlertMetadata(
            type=_map_alert_type(flat_post.get("alert_type", "low")),
            urgency=flat_post.get("alert_urgency", flat_post.get("alert_type", "low")),
            reach=flat_post.get("alert_reach") or metadata.get("reach"),
            influence_score=flat_post.get("alert_influence_score") or metadata.get("influence_score")
        ),
        business_category=flat_post.get("business_category")
    )


def _map_alert_to_severity(alert_type: str | None) -> str:
    """Mapea alert_type a severity level."""
    if not alert_type:
        return "low"
    mapping = {
        "low": "low",
        "middle": "high",
        "high": "critical"
    }
    return mapping.get(str(alert_type).lower(), "low")


def _map_churn_to_risk_level(churn_risk: bool) -> str:
    """Mapea boolean churn_risk a nivel de riesgo."""
    return "high" if churn_risk else "low"


def _map_alert_type(alert_type: str) -> str:
    """Mapea alert_type a tipo de alerta."""
    if "bug" in str(alert_type).lower():
        return "technical"
    elif "revenue" in str(alert_type).lower() or "financial" in str(alert_type).lower():
        return "financial"
    elif "competitor" in str(alert_type).lower():
        return "competitive"
    else:
        return "community"


def get_monitored_forums(_: Session) -> int:
    """Cantidad de webs/dominios configurados para búsqueda en SearchService."""
    return SearchService.count_monitored_search_domains()


def get_monitored_bugs(
    db: Session,
    *,
    sentiment: str | None = None,
    platform: str | None = None,
    bug: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> int:
    """Cuenta posts con bug dentro de la misma ventana que usa el fetch.

    El conteo se hace sobre los posts ya filtrados y paginados por `list_monitorization_posts()`
    para que la métrica corresponda exactamente a los 20 registros mostrados en UI.
    """
    try:
        sql = """
            SELECT COUNT(*) FROM (
                SELECT bug_category AS bug_value
                FROM analyzed_posts
                WHERE 1=1
        """
        params: dict[str, object] = {}

        if sentiment:
            sql += " AND sentiment_label = :sentiment"
            params["sentiment"] = sentiment
        if platform:
            sql += " AND source_platform = :platform"
            params["platform"] = platform
        if bug:
            sql += " AND bug_category = :bug"
            params["bug"] = bug

        sql += " ORDER BY date_post DESC NULLS LAST, id DESC LIMIT :limit OFFSET :offset) w"
        sql += " WHERE COALESCE(NULLIF(TRIM(LOWER(bug_value)), ''), 'none') NOT IN ('none')"
        params["limit"] = limit
        params["offset"] = skip

        res = db.execute(text(sql), params)
        return int(res.scalar() or 0)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    try:
        subq = db.query(Post.bug.label("bug_value"))
        if sentiment:
            subq = subq.filter(Post.sentiment == sentiment)
        if platform:
            subq = subq.filter(Post.platform == platform)
        if bug:
            subq = subq.filter(Post.bug == bug)
        subq = (
            subq.order_by(Post.date.desc(), Post.id.desc())
            .offset(skip)
            .limit(limit)
            .subquery()
        )
        bug_expr = func.trim(func.lower(subq.c.bug_value))
        cnt = (
            db.query(func.count())
            .filter(subq.c.bug_value.isnot(None))
            .filter(bug_expr.notin_(["", "none"]))
            .scalar()
            or 0
        )
        return int(cnt)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def count_monitored_posts(db: Session, start_date: datetime | None = None, end_date: datetime | None = None) -> int:
    """Cuenta plataformas distintas mencionadas en la base de datos excluyendo Unity.

    Usa COUNT(DISTINCT) agregado en SQL para no traer datos innecesarios.
    """
    try:
        sql = """
            SELECT COUNT(DISTINCT LOWER(TRIM(platform_mentioned))) 
            FROM analyzed_posts 
            WHERE platform_mentioned IS NOT NULL 
            AND LOWER(TRIM(platform_mentioned)) NOT IN ('', 'none')
        """
        res = db.execute(text(sql))
        return int(res.scalar() or 0)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    try:
        # ORM fallback: usando func.count(func.distinct()) para obtener agregado en BD
        platform_expr = func.lower(func.trim(Post.platform))
        cnt = (
            db.query(func.count(func.distinct(platform_expr)))
            .filter(Post.platform.isnot(None))
            .filter(func.trim(func.lower(Post.platform)).notin_(["unity", "", "none"]))
            .scalar()
            or 0
        )
        return int(cnt)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def get_sources_count(db: Session) -> int:
    """Total de posts en analyzed_posts (corpus de inteligencia en vivo)."""
    try:
        res = db.execute(text("SELECT COUNT(*) FROM analyzed_posts"))
        return int(res.scalar() or 0)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    try:
        cnt = db.query(func.count(Post.id)).scalar() or 0
        return int(cnt)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def get_last_update_time(db: Session) -> str | None:
    """Hora del post más reciente en analyzed_posts (HH:MM:SS)."""
    try:
        res = db.execute(text("SELECT MAX(date_post) FROM analyzed_posts"))
        value = res.scalar()
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.strftime("%H:%M:%S")
        return str(value)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    try:
        latest = db.query(func.max(Post.date)).scalar()
        if latest is None:
            return None
        if isinstance(latest, datetime):
            return latest.strftime("%H:%M:%S")
        return str(latest)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        return None

