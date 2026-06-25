"""Servicio para NPS y Churn Predictor desde analyzed_posts.

Fórmulas:
- NPS por engine = (promoters - detractors) / total * 100  →  escala -100..+100
  Normalizado a UI 0-100 = (nps_raw + 100) / 2
- Churn: nivel dominante (high/medium/low) según conteo, probabilidad = avg_churn_probability / 100
"""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, func, case, and_, String

from app.modules.metrics.analyzed_post_model import AnalyzedPost

logger = logging.getLogger(__name__)

# Engines que queremos reportar y cómo se llaman en la BD
_ENGINE_VARIANTS: dict[str, list[str]] = {
    "unity": ["unity"],
    "godot": ["godot"],
    "unreal": ["unreal"],
}


def _nps_normalized(nps_raw: float) -> int:
    """Transforma NPS de escala -100..+100 a 0..100 para la barra de la UI."""
    return round((nps_raw + 100) / 2)


def get_nps_churn(db: Session) -> dict:
    """
    Calcula NPS por engine (unity, godot, unreal) y Churn Predictor para Unity.
    Returns un dict compatible con NpsChurnResponse.
    """
    nps_result: dict[str, int] = {}
    raw_scores: list[float] = []

    for engine, variants in _ENGINE_VARIANTS.items():
        # ORM query for NPS
        stmt = select(
            func.count().label("total"),
            func.sum(case((AnalyzedPost.would_recommend == True, 1), else_=0)).label(
                "promoters"
            ),
            func.sum(case((AnalyzedPost.would_recommend == False, 1), else_=0)).label(
                "detractors"
            ),
            func.sum(
                case(
                    (AnalyzedPost.sentiment_label.cast(String) == "positive", 1),
                    else_=0,
                )
            ).label("pos"),
            func.sum(
                case(
                    (AnalyzedPost.sentiment_label.cast(String) == "negative", 1),
                    else_=0,
                )
            ).label("neg"),
        ).where(AnalyzedPost.platform_mentioned.ilike(f"%{engine}%"))

        row = db.execute(stmt).first()

        total = int(getattr(row, "total", 0) or 0)
        promoters = int(getattr(row, "promoters", 0) or 0)
        detractors = int(getattr(row, "detractors", 0) or 0)
        pos = int(getattr(row, "pos", 0) or 0)
        neg = int(getattr(row, "neg", 0) or 0)

        if total == 0:
            nps_result[engine] = 50
            continue

        if (promoters + detractors) > 0:
            nps_raw = ((promoters - detractors) / total) * 100
        else:
            # Fallback: usamos sentiment_label
            tot_sent = total if total > 0 else 1
            nps_raw = ((pos - neg) / tot_sent) * 100

        normalized = _nps_normalized(nps_raw)
        nps_result[engine] = max(0, min(100, normalized))
        raw_scores.append(nps_raw)

    # industry = promedio de los 3 engines
    if raw_scores:
        avg_raw = sum(raw_scores) / len(raw_scores)
        nps_result["industry"] = max(0, min(100, _nps_normalized(avg_raw)))
    else:
        nps_result["industry"] = 50

    # ── Churn Predictor (solo Unity) ─────────────────────────────────
    stmt_churn = select(
        func.count().label("total"),
        func.avg(AnalyzedPost.churn_probability).label("avg_prob"),
        func.sum(
            case((AnalyzedPost.churn_risk.cast(String) == "high", 1), else_=0)
        ).label("high_cnt"),
        func.sum(
            case((AnalyzedPost.churn_risk.cast(String) == "medium", 1), else_=0)
        ).label("medium_cnt"),
        func.sum(
            case((AnalyzedPost.churn_risk.cast(String) == "low", 1), else_=0)
        ).label("low_cnt"),
    ).where(
        and_(
            AnalyzedPost.platform_mentioned.ilike("%unity%"),
            AnalyzedPost.churn_probability.isnot(None),
        )
    )

    churn_row = db.execute(stmt_churn).first()

    total_unity = int(getattr(churn_row, "total", 0) or 0)
    avg_prob = float(getattr(churn_row, "avg_prob", 0.0) or 0.0)
    high_cnt = int(getattr(churn_row, "high_cnt", 0) or 0)
    medium_cnt = int(getattr(churn_row, "medium_cnt", 0) or 0)
    low_cnt = int(getattr(churn_row, "low_cnt", 0) or 0)

    if total_unity == 0:
        risk_level = "low"
        probability = 0.2
    else:
        if high_cnt >= medium_cnt and high_cnt >= low_cnt:
            risk_level = "high"
        elif medium_cnt >= low_cnt:
            risk_level = "medium"
        else:
            risk_level = "low"
        probability = round(avg_prob / 100, 3)

    return {
        "nps": nps_result,
        "churn": {
            "risk": risk_level,
            "probability": probability,
            "avg_churn_pct": round(avg_prob, 2),
            "high_count": high_cnt,
            "medium_count": medium_cnt,
            "low_count": low_cnt,
        },
        "meta": {
            "total_posts_analyzed": total_unity,
            "engines_evaluated": list(_ENGINE_VARIANTS.keys()),
        },
    }
