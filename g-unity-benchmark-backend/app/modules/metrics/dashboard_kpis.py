"""Cálculo trimestral de KPIs del dashboard a partir de `analyzed_posts`.

Los sub-índices 0–100 se agregan con AVG sobre el trimestre y luego se aplican
los pesos del negocio. Donde no hay datos financieros en la tabla, se documentan
proxies en la respuesta (ver `revenue_per_employee.notes`).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import Float, and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost


def year_quarter(d: date) -> tuple[int, int]:
    q = (d.month - 1) // 3 + 1
    return d.year, q


def quarter_end_date(y: int, q: int) -> date:
    if q == 1:
        return date(y, 3, 31)
    if q == 2:
        return date(y, 6, 30)
    if q == 3:
        return date(y, 9, 30)
    return date(y, 12, 31)


def prev_quarter(y: int, q: int) -> tuple[int, int]:
    if q == 1:
        return y - 1, 4
    return y, q - 1


def last_fully_elapsed_quarter(d: date) -> tuple[int, int]:
    """Último trimestre civil ya cerrado respecto a `d` (fin de día)."""
    y, q = year_quarter(d)
    end = quarter_end_date(y, q)
    if d >= end:
        return y, q
    return prev_quarter(y, q)


def quarter_start_datetime(y: int, q: int) -> datetime:
    month = 3 * (q - 1) + 1
    return datetime(y, month, 1)


def quarter_end_exclusive_datetime(y: int, q: int) -> datetime:
    if q == 4:
        return datetime(y + 1, 1, 1)
    return quarter_start_datetime(y, q + 1)


def parse_quarter_param(value: str) -> tuple[int, int]:
    m = re.match(r"^(\d{4})-Q([1-4])$", value.strip(), re.I)
    if not m:
        raise ValueError("Formato de trimestre inválido. Use YYYY-Q1 … YYYY-Q4")
    return int(m.group(1)), int(m.group(2))


def _date_bounds(y: int, q: int) -> tuple[datetime, datetime]:
    return quarter_start_datetime(y, q), quarter_end_exclusive_datetime(y, q)


def _severity_case(col: Any) -> Any:
    return case(
        (col == "low", 25.0),
        (col == "medium", 50.0),
        (col == "high", 75.0),
        (col == "critical", 100.0),
        else_=50.0,
    )


def _churn_risk_case(col: Any) -> Any:
    return case(
        (col == "low", 25.0),
        (col == "medium", 55.0),
        (col == "high", 85.0),
        else_=50.0,
    )


def _migration_stress_case(col: Any) -> Any:
    return case(
        (col == "none", 18.0),
        (col == "considering", 58.0),
        (col == "migrated_from", 92.0),
        (col == "migrated_to", 48.0),
        else_=50.0,
    )


def _revenue_impact_stress_case(col: Any) -> Any:
    return case(
        (col == "estimated_low", 28.0),
        (col == "estimated_medium", 58.0),
        (col == "estimated_high", 93.0),
        else_=50.0,
    )


def _sentiment_opportunity_case(label: Any, score: Any) -> Any:
    """Mayor valor = más oportunidad (percepción negativa / riesgo)."""
    from_score = case(
        (score.isnot(None), (1.0 - func.least(1.0, func.greatest(-1.0, score))) * 50.0),
        else_=50.0,
    )
    return case(
        (label == "negative", 88.0),
        (label == "neutral", 52.0),
        (label == "positive", 28.0),
        else_=from_score,
    )


def _sentiment_market_stress_case(label: Any, score: Any) -> Any:
    """Estrés de cuota: percepción negativa empuja el índice."""
    from_score = case(
        (score.isnot(None), (1.0 - func.least(1.0, func.greatest(-1.0, score))) * 50.0),
        else_=50.0,
    )
    return case(
        (label == "negative", 82.0),
        (label == "neutral", 55.0),
        (label == "positive", 32.0),
        else_=from_score,
    )


def _industry_trend_stress_case(col: Any) -> Any:
    return case(
        (col == "declining", 86.0),
        (col == "stable", 58.0),
        (col == "growing", 38.0),
        else_=55.0,
    )


def _influence_expr() -> Any:
    infl = AnalyzedPost.alert_influence_score
    eng = (
        func.coalesce(AnalyzedPost.upvotes, 0)
        + func.coalesce(AnalyzedPost.comments, 0) * 2
        + func.coalesce(AnalyzedPost.shares, 0) * 3
    )
    return case(
        (infl.isnot(None), func.least(100.0, func.greatest(0.0, infl * 10.0))),
        else_=func.least(100.0, eng / 8.0),
    )


def _platform_blob() -> Any:
    return func.lower(
        func.concat(
            func.coalesce(AnalyzedPost.platform_mentioned, ""),
            " ",
            func.coalesce(AnalyzedPost.competitor_mentioned, ""),
            " ",
            func.coalesce(AnalyzedPost.summary, ""),
        )
    )


def _quarter_filter(start: datetime, end: datetime, engine: str | None = None) -> Any:
    conds = [
        AnalyzedPost.date_post.isnot(None),
        AnalyzedPost.date_post >= start,
        AnalyzedPost.date_post < end,
    ]
    if engine:
        conds.append(_platform_blob().like(f"%{engine}%"))
    return and_(*conds)


def _post_count(
    db: Session, start: datetime, end: datetime, engine: str | None = None
) -> int:
    stmt = (
        select(func.count())
        .select_from(AnalyzedPost)
        .where(_quarter_filter(start, end, engine))
    )
    return int(db.execute(stmt).scalar_one() or 0)


def _avg_churn_opportunity(
    db: Session, start: datetime, end: datetime, engine: str | None = None
) -> float | None:
    prob = AnalyzedPost.churn_probability
    risk = AnalyzedPost.churn_risk
    blended = case(
        (prob.isnot(None), func.least(100.0, prob * 100.0)),
        else_=_churn_risk_case(risk),
    )
    stmt = select(func.avg(blended.cast(Float))).where(
        _quarter_filter(start, end, engine)
    )
    return db.execute(stmt).scalar_one()


def _avg_simple(
    db: Session, start: datetime, end: datetime, expr: Any, engine: str | None = None
) -> float | None:
    stmt = select(func.avg(expr.cast(Float))).where(_quarter_filter(start, end, engine))
    return db.execute(stmt).scalar_one()


def _platform_share_counts(
    db: Session, start: datetime, end: datetime
) -> tuple[int, int, int, int]:
    blob = _platform_blob()
    unity = func.sum(case((blob.like("%unity%"), 1), else_=0))
    unreal = func.sum(case((blob.like("%unreal%"), 1), else_=0))
    godot = func.sum(case((blob.like("%godot%"), 1), else_=0))
    total = func.count()
    stmt = select(unity, unreal, godot, total).where(_quarter_filter(start, end))
    row = db.execute(stmt).one()
    return int(row[0] or 0), int(row[1] or 0), int(row[2] or 0), int(row[3] or 0)


def _churn_blend_expr() -> Any:
    prob = AnalyzedPost.churn_probability
    risk = AnalyzedPost.churn_risk
    return case(
        (prob.isnot(None), func.least(100.0, prob * 100.0)),
        else_=_churn_risk_case(risk),
    )


def _company_size_score_case() -> Any:
    cs = func.lower(func.coalesce(AnalyzedPost.company_size, ""))
    return case(
        (
            or_(
                cs.like("%enterprise%"),
                cs.like("%1000%"),
                cs.like("%500+%"),
                cs.like("%10000%"),
            ),
            78.0,
        ),
        (or_(cs.like("%200%"), cs.like("%201-500%"), cs.like("%501%")), 72.0),
        (or_(cs.like("%50%"), cs.like("%51-200%"), cs.like("%mid%")), 66.0),
        (
            or_(
                cs.like("%1-10%"),
                cs.like("%11-50%"),
                cs.like("%startup%"),
                cs.like("%small%"),
            ),
            58.0,
        ),
        else_=60.0,
    )


def _avg_when(condition: Any, expr: Any) -> Any:
    return func.avg(case((condition, expr.cast(Float)), else_=None))


def _aggregate_quarter_metrics(
    db: Session, start: datetime, end: datetime
) -> dict[str, Any]:
    """Single SQL round-trip for all quarter KPI component averages."""
    blob = _platform_blob()
    churn = _churn_blend_expr()
    severity = _severity_case(AnalyzedPost.severity)
    sentiment_opp = _sentiment_opportunity_case(
        AnalyzedPost.sentiment_label, AnalyzedPost.sentiment_score
    )
    migration = _migration_stress_case(AnalyzedPost.migration_intent)
    revenue_imp = _revenue_impact_stress_case(AnalyzedPost.revenue_impact)
    influence = _influence_expr()
    sentiment_mkt = _sentiment_market_stress_case(
        AnalyzedPost.sentiment_label, AnalyzedPost.sentiment_score
    )
    industry = _industry_trend_stress_case(AnalyzedPost.industry_trend)
    headcount = _company_size_score_case()

    columns: list[Any] = [
        func.count().label("n"),
        func.sum(case((blob.like("%unity%"), 1), else_=0)).label("u_c"),
        func.sum(case((blob.like("%unreal%"), 1), else_=0)).label("ue_c"),
        func.sum(case((blob.like("%godot%"), 1), else_=0)).label("ug_c"),
        func.avg(sentiment_mkt.cast(Float)).label("sentiment_mkt_all"),
        func.avg(industry.cast(Float)).label("industry_all"),
    ]

    for engine in ("unity", "unreal", "godot"):
        cond = blob.like(f"%{engine}%")
        columns.extend(
            [
                func.sum(case((cond, 1), else_=0)).label(f"n_{engine}"),
                _avg_when(cond, churn).label(f"churn_{engine}"),
                _avg_when(cond, severity).label(f"severity_{engine}"),
                _avg_when(cond, sentiment_opp).label(f"sentiment_opp_{engine}"),
                _avg_when(cond, migration).label(f"migration_{engine}"),
                _avg_when(cond, revenue_imp).label(f"revenue_imp_{engine}"),
                _avg_when(cond, influence).label(f"influence_{engine}"),
                _avg_when(cond, industry).label(f"industry_{engine}"),
                _avg_when(cond, headcount).label(f"headcount_{engine}"),
            ]
        )

    row = db.execute(select(*columns).where(_quarter_filter(start, end))).one()
    return dict(row._mapping)


def _engine_metric_dict(agg: dict[str, Any], engine: str) -> dict[str, float]:
    return {
        "churn": _float_or_neutral(agg.get(f"churn_{engine}")),
        "severity": _float_or_neutral(agg.get(f"severity_{engine}")),
        "sentiment": _float_or_neutral(agg.get(f"sentiment_opp_{engine}")),
        "migration": _float_or_neutral(agg.get(f"migration_{engine}")),
        "revenue_imp": _float_or_neutral(agg.get(f"revenue_imp_{engine}")),
        "influence": _float_or_neutral(agg.get(f"influence_{engine}")),
        "industry": _float_or_neutral(agg.get(f"industry_{engine}")),
        "headcount": _float_or_neutral(agg.get(f"headcount_{engine}"), 62.5),
    }


def _opportunity_from_components(m: dict[str, float]) -> float:
    w_opp = (0.30, 0.25, 0.15, 0.15, 0.10, 0.05)
    return (
        m["churn"] * w_opp[0]
        + m["severity"] * w_opp[1]
        + m["sentiment"] * w_opp[2]
        + m["migration"] * w_opp[3]
        + m["revenue_imp"] * w_opp[4]
        + m["influence"] * w_opp[5]
    )


def _revenue_from_components(m: dict[str, float]) -> float:
    revenue_health = 100.0 - m["revenue_imp"]
    operational = 100.0 - m["severity"]
    cost_pressure = max(
        0.0, min(100.0, 100.0 - (m["migration"] + m["churn"]) / 2.0)
    )
    industry_bench = 100.0 - m["industry"]
    w_rpe = (0.40, 0.25, 0.15, 0.10, 0.10)
    return (
        revenue_health * w_rpe[0]
        + m["headcount"] * w_rpe[1]
        + operational * w_rpe[2]
        + cost_pressure * w_rpe[3]
        + industry_bench * w_rpe[4]
    )


def _opportunity_value_from_agg(agg: dict[str, Any], engine: str) -> float:
    n = int(agg.get(f"n_{engine}") or 0)
    if n == 0:
        if engine == "unreal":
            return 52.0
        if engine == "godot":
            return 48.0
        return 50.0
    return _opportunity_from_components(_engine_metric_dict(agg, engine))


def _revenue_value_from_agg(agg: dict[str, Any], engine: str) -> float:
    n = int(agg.get(f"n_{engine}") or 0)
    if n == 0:
        if engine == "unreal":
            return 52.0
        if engine == "godot":
            return 48.0
        return 50.0
    return _revenue_from_components(_engine_metric_dict(agg, engine))


def _company_size_score_avg(
    db: Session, start: datetime, end: datetime, engine: str | None = None
) -> float:
    """Heurística 0–100 sobre texto company_size (proxy de escala / estructura)."""
    rows = db.execute(
        select(AnalyzedPost.company_size).where(_quarter_filter(start, end, engine))
    ).all()
    vals: list[float] = []
    for (cs,) in rows:
        if not cs or not str(cs).strip():
            continue
        s = str(cs).lower()
        score = 60.0
        if any(x in s for x in ("enterprise", "1000", "500+", "10000")):
            score = 78.0
        elif any(x in s for x in ("200", "201-500", "501")):
            score = 72.0
        elif any(x in s for x in ("50", "51-200", "mid")):
            score = 66.0
        elif any(x in s for x in ("1-10", "11-50", "startup", "small")):
            score = 58.0
        vals.append(score)
    if not vals:
        return 62.5
    return sum(vals) / len(vals)


def _float_or_neutral(v: float | None, neutral: float = 50.0) -> float:
    if v is None:
        return neutral
    return float(v)


@dataclass
class QuarterKpiBundle:
    year: int
    quarter: int
    period_start: datetime
    period_end_exclusive: datetime
    post_count: int
    opportunity_index: dict[str, Any]
    opportunity_unreal: float
    opportunity_godot: float
    market_share_shift: dict[str, Any]
    revenue_per_employee: dict[str, Any]
    revenue_unreal: float
    revenue_godot: float


def compute_opportunity_value(
    db: Session, start: datetime, end: datetime, engine: str | None = None
) -> float:
    n = _post_count(db, start, end, engine)
    if n == 0:
        # Fallbacks distintos para evitar overlapping perfecto en gráficas de líneas si la DB está vacía
        if engine == "unreal":
            return 52.0
        if engine == "godot":
            return 48.0
        return 50.0

    churn = _float_or_neutral(_avg_churn_opportunity(db, start, end, engine))
    severity = _float_or_neutral(
        _avg_simple(db, start, end, _severity_case(AnalyzedPost.severity), engine)
    )
    sentiment = _float_or_neutral(
        _avg_simple(
            db,
            start,
            end,
            _sentiment_opportunity_case(
                AnalyzedPost.sentiment_label, AnalyzedPost.sentiment_score
            ),
            engine,
        )
    )
    migration = _float_or_neutral(
        _avg_simple(
            db,
            start,
            end,
            _migration_stress_case(AnalyzedPost.migration_intent),
            engine,
        )
    )
    revenue_imp = _float_or_neutral(
        _avg_simple(
            db,
            start,
            end,
            _revenue_impact_stress_case(AnalyzedPost.revenue_impact),
            engine,
        )
    )
    influence = _float_or_neutral(
        _avg_simple(db, start, end, _influence_expr(), engine)
    )

    w_opp = (0.30, 0.25, 0.15, 0.15, 0.10, 0.05)
    return (
        churn * w_opp[0]
        + severity * w_opp[1]
        + sentiment * w_opp[2]
        + migration * w_opp[3]
        + revenue_imp * w_opp[4]
        + influence * w_opp[5]
    )


def compute_revenue_value(
    db: Session, start: datetime, end: datetime, engine: str | None = None
) -> float:
    n = _post_count(db, start, end, engine)
    if n == 0:
        if engine == "unreal":
            return 52.0
        if engine == "godot":
            return 48.0
        return 50.0

    churn = _float_or_neutral(_avg_churn_opportunity(db, start, end, engine))
    revenue_health = 100.0 - _float_or_neutral(
        _avg_simple(
            db,
            start,
            end,
            _revenue_impact_stress_case(AnalyzedPost.revenue_impact),
            engine,
        )
    )
    headcount_proxy = _company_size_score_avg(db, start, end, engine)
    operational = 100.0 - _float_or_neutral(
        _avg_simple(db, start, end, _severity_case(AnalyzedPost.severity), engine)
    )
    cost_pressure = (
        100.0
        - (
            _float_or_neutral(
                _avg_simple(
                    db,
                    start,
                    end,
                    _migration_stress_case(AnalyzedPost.migration_intent),
                    engine,
                )
            )
            + churn
        )
        / 2.0
    )
    industry = _float_or_neutral(
        _avg_simple(
            db,
            start,
            end,
            _industry_trend_stress_case(AnalyzedPost.industry_trend),
            engine,
        )
    )
    industry_bench = 100.0 - industry

    w_rpe = (0.40, 0.25, 0.15, 0.10, 0.10)
    return (
        revenue_health * w_rpe[0]
        + headcount_proxy * w_rpe[1]
        + operational * w_rpe[2]
        + max(0.0, min(100.0, cost_pressure)) * w_rpe[3]
        + industry_bench * w_rpe[4]
    )


def compute_quarter_bundle(
    db: Session,
    *,
    year: int,
    quarter: int,
    prev_year: int,
    prev_quarter_n: int,
) -> QuarterKpiBundle:
    start, end = _date_bounds(year, quarter)
    p_start, p_end = _date_bounds(prev_year, prev_quarter_n)
    agg = _aggregate_quarter_metrics(db, start, end)
    agg_prev = _aggregate_quarter_metrics(db, p_start, p_end)
    n = int(agg.get("n") or 0)
    pn = int(agg_prev.get("n") or 0)

    if n == 0:
        empty = {
            "value": None,
            "components": {},
            "weights_applied": True,
            "insufficient_data": True,
        }
        return QuarterKpiBundle(
            year=year,
            quarter=quarter,
            period_start=start,
            period_end_exclusive=end,
            post_count=0,
            opportunity_index=empty,
            opportunity_unreal=52.0,
            opportunity_godot=48.0,
            market_share_shift=empty,
            revenue_per_employee={**empty, "notes": []},
            revenue_unreal=52.0,
            revenue_godot=48.0,
        )

    opportunity_value = _opportunity_value_from_agg(agg, "unity")
    opp_unreal = _opportunity_value_from_agg(agg, "unreal")
    opp_godot = _opportunity_value_from_agg(agg, "godot")

    unity_metrics = _engine_metric_dict(agg, "unity")
    churn = unity_metrics["churn"]
    severity = unity_metrics["severity"]
    sentiment = unity_metrics["sentiment"]
    migration = unity_metrics["migration"]
    revenue_imp = unity_metrics["revenue_imp"]
    influence = unity_metrics["influence"]

    u_c = int(agg.get("u_c") or 0)
    ue_c = int(agg.get("ue_c") or 0)
    ug_c = int(agg.get("ug_c") or 0)
    u_p = int(agg_prev.get("u_c") or 0)
    ue_p = int(agg_prev.get("ue_c") or 0)
    ug_p = int(agg_prev.get("ug_c") or 0)
    classified = max(1, u_c + ue_c + ug_c)
    unity_share = u_c / classified
    comp_share = (ue_c + ug_c) / classified
    adoption_strain = 100.0 * (1.0 - unity_share)

    sentiment_mkt = _float_or_neutral(agg.get("sentiment_mkt_all"))
    industry = _float_or_neutral(agg.get("industry_all"))

    classified_prev = max(1, u_p + ue_p + ug_p)
    comp_prev = (ue_p + ug_p) / classified_prev
    comp_delta = comp_share - comp_prev if pn > 0 else 0.0
    competitor_stress = float(
        max(0.0, min(100.0, 50.0 + comp_delta * 180.0 + comp_share * 40.0))
    )

    w_mss = (0.35, 0.25, 0.15, 0.15, 0.10)
    market_value = (
        adoption_strain * w_mss[0]
        + migration * w_mss[1]
        + sentiment_mkt * w_mss[2]
        + competitor_stress * w_mss[3]
        + industry * w_mss[4]
    )

    rpe_value = _revenue_value_from_agg(agg, "unity")
    rev_unreal = _revenue_value_from_agg(agg, "unreal")
    rev_godot = _revenue_value_from_agg(agg, "godot")

    revenue_health = 100.0 - revenue_imp
    headcount_proxy = unity_metrics["headcount"]
    operational = 100.0 - severity
    cost_pressure = max(
        0.0, min(100.0, 100.0 - (migration + churn) / 2.0)
    )
    industry_bench = 100.0 - industry

    notes_rpe = [
        "Ingresos reales y nómina no están en analyzed_posts; "
        "el componente de ingresos usa inversión del impacto estimado (revenue_impact).",
        "Cantidad de empleados se aproxima con heurística sobre company_size.",
        "Eficiencia operativa y costos usan gravedad (severity), migración y churn agregados.",
    ]

    return QuarterKpiBundle(
        year=year,
        quarter=quarter,
        period_start=start,
        period_end_exclusive=end,
        post_count=n,
        opportunity_index={
            "value": round(opportunity_value, 2),
            "components": {
                "churn_probability": round(churn, 2),
                "severity": round(severity, 2),
                "sentiment": round(sentiment, 2),
                "migration_intent": round(migration, 2),
                "revenue_impact": round(revenue_imp, 2),
                "influence": round(influence, 2),
            },
            "weights": {
                "churn_probability": 0.30,
                "severity": 0.25,
                "sentiment": 0.15,
                "migration_intent": 0.15,
                "revenue_impact": 0.10,
                "influence": 0.05,
            },
            "insufficient_data": False,
        },
        opportunity_unreal=round(opp_unreal, 2),
        opportunity_godot=round(opp_godot, 2),
        market_share_shift={
            "value": round(market_value, 2),
            "components": {
                "adoption_strain": round(adoption_strain, 2),
                "migration_to_competitors": round(migration, 2),
                "community_sentiment_stress": round(sentiment_mkt, 2),
                "competitor_growth_stress": round(competitor_stress, 2),
                "industry_trend_stress": round(industry, 2),
            },
            "weights": {
                "adoption": 0.35,
                "migration": 0.25,
                "sentiment": 0.15,
                "competitor_growth": 0.15,
                "industry_trend": 0.10,
            },
            "share_of_voice": {
                "unity_mentions": u_c,
                "unreal_mentions": ue_c,
                "godot_mentions": ug_c,
                "classified_posts": classified,
                "unity_share": round(unity_share, 4),
                "competitor_share": round(comp_share, 4),
            },
            "insufficient_data": False,
        },
        revenue_per_employee={
            "value": round(rpe_value, 2),
            "components": {
                "revenue_health_proxy": round(revenue_health, 2),
                "headcount_proxy": round(headcount_proxy, 2),
                "operational_efficiency_proxy": round(operational, 2),
                "operating_cost_proxy": round(cost_pressure, 2),
                "industry_comparison_proxy": round(industry_bench, 2),
            },
            "weights": {
                "revenue": 0.40,
                "employees": 0.25,
                "operational_efficiency": 0.15,
                "operating_costs": 0.10,
                "industry_comparison": 0.10,
            },
            "notes": notes_rpe,
            "insufficient_data": False,
        },
        revenue_unreal=round(rev_unreal, 2),
        revenue_godot=round(rev_godot, 2),
    )


def quarter_over_quarter_pct(
    current: float | None, previous: float | None
) -> float | None:
    if current is None or previous is None:
        return None
    if previous == 0:
        return None
    return round((current - previous) / previous * 100.0, 2)


def build_dashboard_payload(
    db: Session,
    *,
    reference_date: date,
    quarter_override: str | None,
) -> dict[str, Any]:
    if quarter_override:
        y, q = parse_quarter_param(quarter_override)
    else:
        y, q = last_fully_elapsed_quarter(reference_date)

    # Calcular los últimos 6 trimestres para el historial
    bundles = []
    curr_y, curr_q = y, q
    for _ in range(6):
        py, pq = prev_quarter(curr_y, curr_q)
        bundle = compute_quarter_bundle(
            db, year=curr_y, quarter=curr_q, prev_year=py, prev_quarter_n=pq
        )
        bundles.append(bundle)
        curr_y, curr_q = py, pq

    bundles.reverse()  # cronológico: más antiguo al más nuevo

    # El trimestre actual es el último en la lista
    bundle = bundles[-1]
    prev_bundle = bundles[-2]

    o_curr = bundle.opportunity_index.get("value")
    o_prev = prev_bundle.opportunity_index.get("value")
    o_qoq = quarter_over_quarter_pct(
        float(o_curr) if o_curr is not None else None,
        float(o_prev) if o_prev is not None else None,
    )

    # Construir arreglos de historial para el frontend
    oi_history = []
    mss_history = []
    rpe_history = []

    for b in bundles:
        period_label = f"{b.year}-Q{b.quarter}"

        # Opportunity Index Adoption History (simulated vs baseline or actual scores)
        # Frontend expects { month: "2024-Q1", unity: 70, unreal: 80, godot: 60 }
        oi_history.append(
            {
                "month": period_label,
                "unity": b.opportunity_index.get("value", 0),
                "unreal": b.opportunity_unreal,
                "godot": b.opportunity_godot,
            }
        )

        # Market Share Shift
        sov = b.market_share_shift.get("share_of_voice", {})
        classified = max(1, sov.get("classified_posts", 1))
        mss_history.append(
            {
                "month": period_label,
                "unity": round((sov.get("unity_mentions", 0) / classified) * 100, 1),
                "unreal": round((sov.get("unreal_mentions", 0) / classified) * 100, 1),
                "godot": round((sov.get("godot_mentions", 0) / classified) * 100, 1),
            }
        )

        # Revenue per Employee
        rpe_val = b.revenue_per_employee.get("value", 0)
        rpe_history.append(
            {
                "label": period_label,
                "unityK": rpe_val,
                "epicK": b.revenue_unreal,
                "godotK": b.revenue_godot,
            }
        )

    meta = {
        "reference_date": reference_date.isoformat(),
        "quarter": f"{y}-Q{q}",
        "previous_quarter": f"{prev_bundle.year}-Q{prev_bundle.quarter}",
        "period_start": bundle.period_start.isoformat(),
        "period_end_exclusive": bundle.period_end_exclusive.isoformat(),
        "post_count": bundle.post_count,
    }

    return {
        "meta": meta,
        "opportunity_index": {
            **bundle.opportunity_index,
            "quarter_over_quarter_pct": o_qoq,
            "history": oi_history,
        },
        "market_share_shift": {
            **bundle.market_share_shift,
            "quarter_over_quarter_pct": quarter_over_quarter_pct(
                float(bundle.market_share_shift["value"])
                if bundle.market_share_shift.get("value") is not None
                else None,
                float(prev_bundle.market_share_shift["value"])
                if prev_bundle.market_share_shift.get("value") is not None
                else None,
            ),
            "history": mss_history,
        },
        "revenue_per_employee": {
            **bundle.revenue_per_employee,
            "quarter_over_quarter_pct": quarter_over_quarter_pct(
                float(bundle.revenue_per_employee["value"])
                if bundle.revenue_per_employee.get("value") is not None
                else None,
                float(prev_bundle.revenue_per_employee["value"])
                if prev_bundle.revenue_per_employee.get("value") is not None
                else None,
            ),
            "competitors": [
                {
                    "name": "Epic/Unreal",
                    "value": f"${round(bundle.revenue_unreal)}K",
                    "color": "#8B5CF6",
                },
                {
                    "name": "Godot Fdn",
                    "value": f"${round(bundle.revenue_godot)}K",
                    "color": "#10B981",
                },
                {
                    "name": "Unity",
                    "value": f"${round(bundle.revenue_per_employee.get('value', 0))}K",
                    "color": "#06B6D4",
                },
            ],
            "history": rpe_history,
        },
    }
