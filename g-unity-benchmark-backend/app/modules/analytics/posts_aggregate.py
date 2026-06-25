"""Agregaciones de analytics sobre filas de hechos: tabla `analyzed_posts` (esquema canónico) o `posts` (MVP).

Señal NPS canónica: `would_recommend` (boolean). Promotor = True, Detractor = False, Null = sin señal.
Las columnas `promotor`/`detractor` quedan solo como compatibilidad con la tabla MVP `posts`.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

# NOTE: avoid importing the legacy ORM model at module import time because
# importing it registers the same `analyzed_posts` table in `Base.metadata`.
# Import the legacy model lazily only when needed to prevent duplicate
# table registration (metrics.AnalyzedPost is the canonical model).
from app.modules.analytics.exceptions import AnalyticsDatabaseUnavailable
from app.modules.analytics.post_normalizer import (
    business_category_to_pillar,
    orm_legacy_analyzed_to_dict,
    orm_post_to_dict,
    to_analytics_row,
)
from app.modules.market_intelligence.models import Post

logger = logging.getLogger(__name__)

# Cachea el descubrimiento de tabla para no paginar timeout/SQL en cada request.
# Se reinicia si la query falla (p. ej. DB volvió a estar disponible).
_TABLE_CACHE: dict[str, str | None] = {}

_PLATFORMS = ("unity", "unreal", "godot", "others")
_DIMS = ("performance", "crash", "ui", "api", "documentation")
_SEVERITY_RANK = {"low": 1.0, "medium": 2.0, "high": 3.0, "critical": 4.0}

# Query param (?business=) desde el front → pilar canónico en inglés (None = todo el corpus).
_BUSINESS_QUERY_TO_PILLAR: dict[str, str | None] = {
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

_PILLAR_DISPLAY = {
    "product": "Product",
    "finance": "Finance",
    "ecosystem": "Ecosystem",
    "positioning": "Positioning",
}


def normalize_business_query(raw: str | None) -> str | None:
    """None → vista General (sin filtro). Valores desconocidos → sin filtro."""
    if raw is None:
        return None
    k = str(raw).strip().lower()
    if not k:
        return None
    return _BUSINESS_QUERY_TO_PILLAR.get(k)


def canonical_pillar_from_metadata(raw: str) -> str | None:
    k = str(raw).strip().lower()
    return _BUSINESS_QUERY_TO_PILLAR.get(k, k if k in _PILLAR_DISPLAY else None)


def filter_posts_for_strategic_pillar(posts: list[dict[str, Any]], business: str | None) -> list[dict[str, Any]]:
    """Subconjunto del corpus para el dashboard. Fuente real: tabla posts / analyzed_posts normalizada."""
    pillar = normalize_business_query(business)
    if pillar is None:
        return posts

    out: list[dict[str, Any]] = []
    for p in posts:
        bc = p.get("business_category")
        if bc is not None and str(bc).strip():
            cp = business_category_to_pillar(str(bc))
            if cp == pillar:
                out.append(p)
            continue

        m = p.get("metadata") or {}
        raw_meta = m.get("strategic_pillar") or m.get("pillar") or m.get("business_theme")
        if raw_meta is not None and str(raw_meta).strip():
            cp = canonical_pillar_from_metadata(str(raw_meta))
            if cp == pillar:
                out.append(p)
            continue

        bc = (p.get("bug_category") or "").strip().lower()
        churn_p = p.get("churn_probability")
        churn_risk = bool(p.get("churn_risk"))
        sent = (p.get("sentiment_label") or "neutral").strip().lower()
        title = (p.get("title") or "").lower()
        summ = (p.get("summary_text") or "").lower()
        blob = f"{title} {summ}"

        fin_kw = (
            "price",
            "cost",
            "revenue",
            "billing",
            "license",
            "subscription",
            "money",
            "monet",
            "pay",
            "churn",
        )
        eco_kw = (
            "partner",
            "asset",
            "plugin",
            "package",
            "community",
            "documentation",
            "ecosystem",
            "integration",
            "store",
        )
        prod_kw = ("bug", "crash", "performance", "editor", "runtime", "build", "workflow", "tool")

        if pillar == "product":
            if bc in ("performance", "crash", "ui", "api"):
                out.append(p)
            elif any(k in blob for k in prod_kw):
                out.append(p)
        elif pillar == "finance":
            if churn_p is not None or churn_risk:
                out.append(p)
            elif any(k in blob for k in fin_kw):
                out.append(p)
        elif pillar == "ecosystem":
            if bc in ("documentation", "api"):
                out.append(p)
            elif any(k in blob for k in eco_kw):
                out.append(p)
        elif pillar == "positioning":
            if p.get("has_promotor_signal") or sent in ("positive", "negative"):
                out.append(p)

    return out


def load_normalized_posts_for_analytics(db: Session, business: str | None = None) -> list[dict[str, Any]]:
    """Posts normalizados, opcionalmente filtrados por pilar estratégico (?business=)."""
    raw = load_normalized_posts(db)
    return filter_posts_for_strategic_pillar(raw, business)


def _score_to_0_10(score: float | None) -> float | None:
    if score is None:
        return None
    return max(0.0, min(10.0, (float(score) + 1.0) * 5.0))


def _analyzed_posts_columns(db: Session) -> set[str]:
    try:
        rows = db.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='analyzed_posts'")
        ).fetchall()
        return {r[0] for r in rows}
    except SQLAlchemyError:
        db.rollback()
        return set()


def _analyzed_posts_is_rich(cols: set[str]) -> bool:
    return bool(cols & {"platform_mentioned", "sentiment_score", "upvotes", "business_category"})


def _load_analyzed_posts_rich(db: Session) -> list[dict[str, Any]]:
    """Read analyzed_posts with dynamic SQL when the table has the new JSON-aligned columns."""
    cols = _analyzed_posts_columns(db)
    if not cols:
        return []

    created_at_expr = "created_at" if "created_at" in cols else "NULL::timestamp"
    date_expr = f"COALESCE(date_post, {created_at_expr})" if "date_post" in cols else created_at_expr
    sentiment_label_expr = (
        "sentiment_label"
        if "sentiment_label" in cols
        else ("sentimental" if "sentimental" in cols else "'neutral'")
    )
    bug_expr = "bug_category" if "bug_category" in cols else ("bug" if "bug" in cols else "NULL")
    upvotes_expr = "upvotes" if "upvotes" in cols else "0"
    churn_prob_expr = (
        "churn_probability"
        if "churn_probability" in cols
        else ("churn_percentage" if "churn_percentage" in cols else "NULL")
    )

    select_sql = f"""
        SELECT
            id, title, summary, url,
            {date_expr} AS date,
            {('platform_mentioned' if 'platform_mentioned' in cols else 'NULL')} AS platform_mentioned,
            {upvotes_expr} AS upvotes,
            {('comments' if 'comments' in cols else '0')} AS comments,
            {('shares' if 'shares' in cols else '0')} AS shares,
            {sentiment_label_expr} AS sentiment_label,
            {('sentiment_score' if 'sentiment_score' in cols else 'NULL')} AS sentiment_score,
            {bug_expr} AS bug_category,
            {('severity' if 'severity' in cols else 'NULL')} AS severity,
            {('churn_risk' if 'churn_risk' in cols else 'NULL')} AS churn_risk,
            {churn_prob_expr} AS churn_probability,
            {('alert_type' if 'alert_type' in cols else "'low'")} AS alert_type,
            {('alert_urgency' if 'alert_urgency' in cols else 'NULL')} AS alert_urgency,
            {('would_recommend' if 'would_recommend' in cols else 'NULL')} AS would_recommend,
            {('business_category' if 'business_category' in cols else 'NULL')} AS business_category,
            {created_at_expr} AS created_at
        FROM analyzed_posts
        ORDER BY id
    """
    rows = db.execute(text(select_sql)).mappings().all()
    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        if item.get("alert_urgency"):
            item.setdefault("alert_metadata", {"urgency": item["alert_urgency"], "type": item.get("alert_type")})
        if item.get("severity"):
            item.setdefault("technical_analysis", {"severity": item["severity"], "bug_category": item.get("bug_category")})
        if item.get("sentiment_label") is not None or item.get("sentiment_score") is not None:
            item.setdefault(
                "sentiment",
                {"label": item.get("sentiment_label"), "score": item.get("sentiment_score")},
            )
        item.setdefault(
            "source",
            {
                "engagement": {
                    "upvotes": item.get("upvotes", 0),
                    "comments": item.get("comments", 0),
                    "shares": item.get("shares", 0),
                }
            },
        )
        out.append(to_analytics_row(item))
    return out


def _discover_table(db: Session) -> str | None:
    """Una sola query lista lo que necesitamos. Si la DB no responde, propagamos para fallar rápido."""
    rows = db.execute(
        text(
            """
            SELECT
                to_regclass('public.posts')           AS posts_oid,
                to_regclass('public.analyzed_posts')  AS analyzed_oid
            """
        )
    ).one()
    has_posts = rows.posts_oid is not None
    has_analyzed = rows.analyzed_oid is not None

    def _count(name: str) -> int:
        try:
            return int(db.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() or 0)
        except SQLAlchemyError:
            db.rollback()
            logger.exception("analytics: error contando %s", name)
            return 0

    posts_n = _count("posts") if has_posts else 0
    analyzed_n = _count("analyzed_posts") if has_analyzed else 0
    logger.info(
        "analytics: tablas detectadas -> posts(existe=%s, filas=%s) | analyzed_posts(existe=%s, filas=%s)",
        has_posts, posts_n, has_analyzed, analyzed_n,
    )

    if not (has_posts or has_analyzed):
        # Imprimimos un inventario para que el equipo sepa dónde están los datos reales.
        try:
            all_tables = db.execute(
                text(
                    """
                    SELECT table_schema || '.' || table_name AS qname
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('pg_catalog','information_schema')
                    ORDER BY 1
                    """
                )
            ).scalars().all()
            logger.warning(
                "analytics: ni `posts` ni `analyzed_posts` existen. Tablas en la DB: %s",
                ", ".join(all_tables) if all_tables else "(ninguna visible para el rol)",
            )
        except SQLAlchemyError:
            logger.exception("analytics: no pude listar tablas para el diagnóstico")

    if analyzed_n > 0 and posts_n == 0:
        return "analyzed_posts"
    if has_posts:
        return "posts"
    if has_analyzed:
        return "analyzed_posts"
    return None


def _analytics_table_choice(db: Session) -> str | None:
    """Devuelve `posts` / `analyzed_posts` / None usando cache de proceso."""
    if "choice" in _TABLE_CACHE:
        return _TABLE_CACHE["choice"]
    choice = _discover_table(db)
    _TABLE_CACHE["choice"] = choice
    return choice


def _row_dict_from_mvp_post(r: Post) -> dict[str, Any]:
    return to_analytics_row(orm_post_to_dict(r))


def _row_dict_from_legacy_analyzed(r: Any) -> dict[str, Any]:
    return to_analytics_row(orm_legacy_analyzed_to_dict(r))


def load_normalized_posts(db: Session) -> list[dict[str, Any]]:
    """Lee `posts` (MVP) o `analyzed_posts` (legacy). Si la DB está caída, lanza 503 vía excepción."""
    try:
        choice = _analytics_table_choice(db)
        if choice == "posts":
            rows = db.query(Post).order_by(Post.id).all()
            logger.info("analytics: cargados %s registros desde `posts`", len(rows))
            return [_row_dict_from_mvp_post(r) for r in rows]
        if choice == "analyzed_posts":
            cols = _analyzed_posts_columns(db)
            if _analyzed_posts_is_rich(cols):
                rich = _load_analyzed_posts_rich(db)
                logger.info(
                    "analytics: cargados %s registros desde `analyzed_posts` (esquema JSON)",
                    len(rich),
                )
                return rich
            # Import legacy ORM model lazily to avoid double-registration
            # of the `analyzed_posts` table in the same MetaData instance.
            from app.modules.analytics.analyzed_post_model import AnalyzedPost

            rows = db.query(AnalyzedPost).order_by(AnalyzedPost.id).all()
            logger.info("analytics: cargados %s registros desde `analyzed_posts` (legacy)", len(rows))
            return [_row_dict_from_legacy_analyzed(r) for r in rows]
        logger.warning("analytics: no existen tablas `posts` ni `analyzed_posts` — devolviendo []")
        return []
    except OperationalError as e:
        _TABLE_CACHE.pop("choice", None)
        logger.error(
            "analytics: la base de datos no responde — revisa red / VPN / IP allowlist. Detalle: %s",
            getattr(e, "orig", e),
        )
        raise AnalyticsDatabaseUnavailable(cause=e) from e
    except SQLAlchemyError as e:
        _TABLE_CACHE.pop("choice", None)
        logger.exception("analytics: error inesperado de SQLAlchemy")
        raise AnalyticsDatabaseUnavailable(cause=e) from e


def _quarter_key(dt: datetime) -> tuple[int, int, str]:
    """Calendar quarter label and sort keys (year, quarter_index)."""
    q = (dt.month - 1) // 3 + 1
    y = dt.year
    return y, q, f"Q{q} {y}"


def get_market_share_trend_from_posts(db: Session, *, business: str | None = None) -> list[dict[str, Any]]:
    """Voice share by calendar quarter: % of posts per engine (existing posts table only)."""
    posts = load_normalized_posts_for_analytics(db, business)
    quarterly: dict[str, dict[str, Any]] = {}
    for p in posts:
        y, q, lab = _quarter_key(p["dt"])
        if lab not in quarterly:
            quarterly[lab] = {"unity": 0, "unreal": 0, "godot": 0, "other": 0, "y": y, "q": q}
        pl = p["platform"]
        if pl == "others":
            quarterly[lab]["other"] += 1
        else:
            quarterly[lab][pl] += 1
    result = []
    for lab in sorted(quarterly.keys(), key=lambda L: (quarterly[L]["y"], quarterly[L]["q"])):
        c = quarterly[lab]
        tot = c["unity"] + c["unreal"] + c["godot"] + c["other"]
        if tot == 0:
            continue
        result.append(
            {
                "period": lab,
                "month": lab,
                "quarter": lab,
                "unity": round(100.0 * c["unity"] / tot, 1),
                "unreal": round(100.0 * c["unreal"] / tot, 1),
                "godot": round(100.0 * c["godot"] / tot, 1),
                "other": round(100.0 * c["other"] / tot, 1),
            }
        )
    return result


def get_developer_satisfaction_from_posts(db: Session, *, business: str | None = None) -> list[dict[str, Any]]:
    """Average satisfaction (0–10) per year and engine; null if no scored posts for that engine/year."""
    posts = load_normalized_posts_for_analytics(db, business)
    by_year: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for p in posts:
        if not p["has_promotor_signal"]:
            continue
        sc = _score_to_0_10(p["sentiment_score"])
        if sc is None:
            continue
        pl = p["platform"]
        if pl == "others":
            continue
        y = str(p["dt"].year)
        by_year[y][pl].append(sc)
    out = []
    for y in sorted(by_year.keys()):
        u = by_year[y].get("unity") or []
        ur = by_year[y].get("unreal") or []
        g = by_year[y].get("godot") or []
        if not u and not ur and not g:
            continue
        out.append(
            {
                "year": y,
                "unity": round(sum(u) / len(u), 1) if u else None,
                "unreal": round(sum(ur) / len(ur), 1) if ur else None,
                "godot": round(sum(g) / len(g), 1) if g else None,
            }
        )
    return out


def get_market_share_vs_satisfaction_from_posts(
    db: Session,
    *,
    posts: list[dict[str, Any]] | None = None,
    business: str | None = None,
) -> list[dict[str, Any]]:
    """Share of posts per engine vs average satisfaction (0–10); satisfaction null if no scored posts."""
    data = posts if posts is not None else load_normalized_posts_for_analytics(db, business)
    counts: dict[str, int] = defaultdict(int)
    scores: dict[str, list[float]] = defaultdict(list)
    for p in data:
        pl = p["platform"]
        counts[pl] += 1
        if not p["has_promotor_signal"]:
            continue
        sc = _score_to_0_10(p["sentiment_score"])
        if sc is not None:
            scores[pl].append(sc)
    tot = sum(counts.values())
    if tot == 0:
        return []
    all_scores = [x for lst in scores.values() for x in lst]
    bench = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0
    out = []
    order = [("unity", "Unity"), ("unreal", "Unreal"), ("godot", "Godot"), ("others", "Other")]
    for key, label in order:
        if counts[key] == 0:
            continue
        share = round(100.0 * counts[key] / tot, 1)
        sl = scores[key]
        sat: float | None = round(sum(sl) / len(sl), 1) if sl else None
        seg_label = label if key != "others" else "Other"
        out.append(
            {
                "segment": seg_label,
                "label": label if key != "others" else "Others",
                "share": share,
                "satisfaction": sat,
                "benchmark": bench,
            }
        )
    return out


def get_satisfaction_by_dimension_from_posts(
    db: Session,
    *,
    posts: list[dict[str, Any]] | None = None,
    business: str | None = None,
) -> list[dict[str, Any]]:
    data = posts if posts is not None else load_normalized_posts_for_analytics(db, business)
    dim_data: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for p in data:
        dim = p["bug_category"]
        if not dim or dim not in _DIMS:
            continue
        if not p["has_promotor_signal"]:
            continue
        sc = _score_to_0_10(p["sentiment_score"])
        if sc is None:
            continue
        pl = p["platform"]
        if pl == "others":
            continue
        dim_data[dim][pl].append(sc)
    out = []
    for dim in _DIMS:
        if dim not in dim_data:
            continue
        u = dim_data[dim].get("unity") or []
        ur = dim_data[dim].get("unreal") or []
        g = dim_data[dim].get("godot") or []
        all_sc = u + ur + g
        if not all_sc:
            continue
        bench = round(sum(all_sc) / len(all_sc), 2)
        out.append(
            {
                "dimension": dim.capitalize(),
                "unity": round(sum(u) / len(u), 1) if u else None,
                "unreal": round(sum(ur) / len(ur), 1) if ur else None,
                "godot": round(sum(g) / len(g), 1) if g else None,
                "benchmark": bench,
            }
        )
    return out


def get_performance_gap_from_posts(
    db: Session,
    *,
    posts: list[dict[str, Any]] | None = None,
    business: str | None = None,
) -> list[dict[str, Any]]:
    data = posts if posts is not None else load_normalized_posts_for_analytics(db, business)
    by: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"eng": [], "churn": [], "sev": []})
    for p in data:
        pl = p["platform"]
        if pl == "others":
            continue
        eng = float(p["upvotes"] + p["comments"] + p["shares"])
        by[pl]["eng"].append(min(100.0, eng / 5.0))
        cp = p["churn_probability"]
        if cp is not None:
            by[pl]["churn"].append(max(0.0, min(100.0, cp * 100.0)))
        rk = _SEVERITY_RANK.get(p["severity"], 0.0)
        if rk:
            by[pl]["sev"].append(rk * 25.0)

    def mean(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 2) if lst else 0.0

    def col(pl: str, key: str) -> float:
        return mean(by.get(pl, {}).get(key, []))

    has_eng = any(by.get(pl, {}).get("eng") for pl in ("unity", "unreal", "godot"))
    has_churn = any(by.get(pl, {}).get("churn") for pl in ("unity", "unreal", "godot"))
    rows: list[dict[str, Any]] = []
    if has_eng:
        rows.append(
            {
                "metric": "Iteration Time (s)",
                "unity": col("unity", "eng"),
                "unreal": col("unreal", "eng"),
                "godot": col("godot", "eng"),
            }
        )
    if has_churn:
        rows.append(
            {
                "metric": "Build Size (MB)",
                "unity": col("unity", "churn"),
                "unreal": col("unreal", "churn"),
                "godot": col("godot", "churn"),
            }
        )
    return rows


def get_global_sentiment_nps_from_posts(
    db: Session,
    *,
    posts: list[dict[str, Any]] | None = None,
    business: str | None = None,
) -> dict[str, Any]:
    data = posts if posts is not None else load_normalized_posts_for_analytics(db, business)
    platforms_data: list[dict[str, Any]] = []
    nps_vals: list[float] = []
    for pl in ("unity", "unreal", "godot"):
        subset = [p for p in data if p["platform"] == pl]
        n = len(subset)
        if n == 0:
            continue
        promoters = sum(1 for p in subset if p["would_recommend"] is True)
        detractors = sum(1 for p in subset if p["would_recommend"] is False)
        denom = promoters + detractors
        nps = 100.0 * (promoters - detractors) / denom if denom else 0.0
        pos = sum(1 for p in subset if p["sentiment_label"] == "positive")
        neg = sum(1 for p in subset if p["sentiment_label"] == "negative")
        neut = sum(1 for p in subset if p["sentiment_label"] not in ("positive", "negative"))
        platforms_data.append(
            {
                "platform": pl.capitalize(),
                "nps": round(float(nps), 2),
                "sentiment_positive": round(100.0 * pos / n, 2),
                "sentiment_neutral": round(100.0 * neut / n, 2),
                "sentiment_negative": round(100.0 * neg / n, 2),
            }
        )
        nps_vals.append(float(nps))
    if not platforms_data:
        return {"benchmark_nps": None, "unity_below_benchmark": False, "platforms": []}
    bench = round(sum(nps_vals) / len(nps_vals), 2)
    unity_row = next((x for x in platforms_data if x["platform"].lower() == "unity"), None)
    unity_below = bool(unity_row and unity_row["nps"] < bench)
    return {
        "benchmark_nps": bench,
        "unity_below_benchmark": unity_below,
        "platforms": platforms_data,
    }


def _trend_from_delta(delta: float, *, invert: bool = False, eps: float = 0.05) -> str:
    """Classify trend; near-zero deltas are neutral (avoids −0.0 pts showing as “bad”)."""
    eff = -delta if invert else delta
    if eff > eps:
        return "positive"
    if eff < -eps:
        return "negative"
    return "neutral"


def _append(items: list[dict], **kwargs: Any) -> None:
    if len(items) >= 8:
        return
    items.append(kwargs)


def _scoped_formula(formula: str, business: str | None) -> str:
    pill = normalize_business_query(business)
    if pill is None:
        return formula
    disp = _PILLAR_DISPLAY.get(pill, pill)
    return (
        f"{formula} "
        f'Scope: «{disp}» pillar — posts filtered from the analyzed corpus via '
        f"business_category column or metadata.strategic_pillar / pillar / business_theme when present, "
        f"otherwise bug-category and title/summary keyword rules in posts_aggregate.filter_posts_for_strategic_pillar. "
        f"The arithmetic for each KPI is identical to General; only the input rows change."
    )


def build_analytics_summary_from_posts(db: Session, business: str | None = None) -> list[dict[str, Any]]:
    """Up to 8 KPIs from existing post rows only; skip a KPI if it has no basis."""
    posts = load_normalized_posts_for_analytics(db, business)
    items: list[dict[str, Any]] = []
    if not posts:
        logger.info("analytics summary: no post rows")
        return items

    total = len(posts)
    unity_posts = [p for p in posts if p["platform"] == "unity"]
    unity_n = len(unity_posts)

    by_quarter: dict[str, dict[str, Any]] = {}
    for p in posts:
        y, q, lab = _quarter_key(p["dt"])
        if lab not in by_quarter:
            by_quarter[lab] = {"unity": 0, "unreal": 0, "godot": 0, "other": 0, "y": y, "q": q}
        pl = p["platform"]
        if pl == "others":
            by_quarter[lab]["other"] += 1
        else:
            by_quarter[lab][pl] += 1
    quarters_sorted = sorted(by_quarter.keys(), key=lambda L: (by_quarter[L]["y"], by_quarter[L]["q"]))

    if quarters_sorted and unity_n:
        share_total = 100.0 * unity_n / total
        change_label = ""
        trend = "neutral"
        if len(quarters_sorted) >= 2:
            q1, q2 = quarters_sorted[-2], quarters_sorted[-1]
            c1, c2 = by_quarter[q1], by_quarter[q2]
            t1 = sum(c1.values()) or 1
            t2 = sum(c2.values()) or 1
            sh1 = 100.0 * c1.get("unity", 0) / t1
            sh2 = 100.0 * c2.get("unity", 0) / t2
            change_label = f"{(sh2 - sh1):+.1f} pts QoQ"
            trend = _trend_from_delta(sh2 - sh1)
        else:
            change_label = f"{share_total:.1f}% of corpus"
        _append(
            items,
            label="Unity voice share",
            value=f"{share_total:.1f}%",
            change=change_label,
            trend=trend,
            formula=_scoped_formula(
                "Unity posts in the current slice ÷ all posts in the same slice. "
                "Change: latest calendar quarter Unity share minus previous quarter (percentage points). "
                "Data: `posts` / `analyzed_posts` normalized in load_normalized_posts.",
                business,
            ),
        )

    if unity_posts:
        pos = sum(1 for p in unity_posts if p["sentiment_label"] == "positive")
        neg = sum(1 for p in unity_posts if p["sentiment_label"] == "negative")
        pos_pct = 100.0 * pos / unity_n
        neg_pct = 100.0 * neg / unity_n
        _append(
            items,
            label="Unity positive sentiment",
            value=f"{pos_pct:.1f}%",
            change=f"{neg_pct:.1f}% negative",
            trend="positive" if pos_pct > neg_pct else "negative" if pos_pct < neg_pct else "neutral",
            formula=_scoped_formula(
                "Count of Unity posts with sentiment label `positive` ÷ all Unity posts in slice × 100. "
                "Secondary figure: share labeled `negative`. Labels come from NLP/classifier on each row.",
                business,
            ),
        )

    nps_block = get_global_sentiment_nps_from_posts(db, posts=posts)
    if nps_block["platforms"]:
        bench = nps_block["benchmark_nps"]
        unity = next((x for x in nps_block["platforms"] if x["platform"].lower() == "unity"), None)
        if unity is not None and bench is not None:
            delta = float(unity["nps"]) - float(bench)
            _append(
                items,
                label="Unity NPS (approx.)",
                value=f"{unity['nps']:.0f}",
                change=f"{delta:+.1f} vs avg",
                trend=_trend_from_delta(delta),
                formula=_scoped_formula(
                    "Approximate NPS per engine on the sliced corpus using `would_recommend`: "
                    "True → promoter, False → detractor, NULL → ignored. "
                    "NPS = 100 × (promoters − detractors) ÷ (promoters + detractors). Benchmark = simple average of engine NPS values shown.",
                    business,
                ),
            )

    if unity_posts:
        crit = sum(1 for p in unity_posts if _was_high_alert(p))
        crit_pct = 100.0 * crit / unity_n
        _append(
            items,
            label="Unity high-severity alerts",
            value=f"{crit}",
            change=f"{crit_pct:.1f}% of Unity posts",
            trend="negative" if crit_pct > 5 else "neutral",
            formula=_scoped_formula(
                "Count of Unity posts where alert_type is `high` OR severity resolves to `high` "
                "(from performance / alert fields after normalization). Denominator: all Unity posts in slice.",
                business,
            ),
        )

    unity_with_churn = [p for p in unity_posts if p["churn_probability"] is not None]
    if unity_with_churn:
        churn_mean = 100.0 * sum(p["churn_probability"] for p in unity_with_churn) / len(unity_with_churn)
        _append(
            items,
            label="Unity avg. churn score",
            value=f"{churn_mean:.1f}%",
            change=f"{len(unity_with_churn)} posts with churn",
            trend="negative" if churn_mean > 50 else "positive" if churn_mean < 25 else "neutral",
            formula=_scoped_formula(
                "Mean of churn_percentage stored on Unity posts that have a non-null churn field; "
                "values treated as 0–100%. Uses Decimal churn_percentage column → normalized churn_probability.",
                business,
            ),
        )

    dim_block = get_satisfaction_by_dimension_from_posts(db, posts=posts)
    dims_with_unity = [d for d in dim_block if d.get("unity") is not None]
    if dims_with_unity:
        av_u = sum(float(d["unity"]) for d in dims_with_unity) / len(dims_with_unity)
        av_b = sum(float(d["benchmark"]) for d in dims_with_unity) / len(dims_with_unity)
        below = sum(1 for d in dims_with_unity if float(d["unity"]) < float(d["benchmark"]))
        _append(
            items,
            label="Unity vs benchmark (themes)",
            value=f"{av_u:.2f}/10",
            change=f"{below}/{len(dims_with_unity)} themes below benchmark",
            trend=_trend_from_delta(av_u - av_b),
            formula=_scoped_formula(
                "Mean Unity satisfaction (0–10) across themes derived from bug tags (performance, crash, ui, api, documentation): "
                "satisfaction proxy = map sentiment_score (−1..1) to 0..10 via (score+1)×5; when sentiment_score is null, "
                "would_recommend=true→+1 and false→−1. Benchmark per theme = average of Unity, Unreal, Godot scores in that theme.",
                business,
            ),
        )

    gapm = get_performance_gap_from_posts(db, posts=posts)
    eng_row = next((r for r in gapm if "iteration" in r["metric"].lower()), None)
    if eng_row:
        vu, vur = float(eng_row["unity"]), float(eng_row["unreal"])
        if vur:
            pct = ((vu - vur) / vur) * 100.0
            _append(
                items,
                label="Engagement: Unity vs Unreal",
                value=f"{vu:.1f}",
                change=f"{pct:+.1f}% vs Unreal",
                trend=_trend_from_delta(vu - vur),
                formula=_scoped_formula(
                    "Engagement proxy per engine: min(100, (upvotes + comments + shares) ÷ 5) averaged over posts "
                    '(shown as "Iteration Time (s)" for chart compatibility). Compare Unity vs Unreal raw index.',
                    business,
                ),
            )

    msv = get_market_share_vs_satisfaction_from_posts(db, posts=posts)
    unity_row = next((x for x in msv if x["segment"] == "Unity"), None)
    if unity_row and unity_row.get("satisfaction") is not None:
        gap = float(unity_row["satisfaction"]) - float(unity_row["benchmark"])
        _append(
            items,
            label="Unity satisfaction vs benchmark",
            value=f"{float(unity_row['satisfaction']):.1f}/10",
            change=f"{gap:+.1f} pts",
            trend=_trend_from_delta(gap),
            formula=_scoped_formula(
                "Mean 0–10 satisfaction on Unity posts that have a would_recommend (or sentiment_score) signal "
                "(same mapping as developer satisfaction chart), minus benchmark where benchmark = "
                "mean satisfaction across all engines on the same sliced corpus.",
                business,
            ),
        )

    return items


def _was_high_alert(p: dict[str, Any]) -> bool:
    alert = (p.get("alert_type") or "").lower()
    sev = (p.get("severity") or "").lower()
    urg = (p.get("alert_urgency") or "").lower()
    return alert in ("high", "critical") or sev in ("high", "critical") or urg in ("high", "critical")
