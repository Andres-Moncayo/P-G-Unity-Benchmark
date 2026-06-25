"""Router de Metrics.

Endpoints:
- GET  /api/v1/metrics           → Listar métricas (paginado, filtro por key)
- GET  /api/v1/metrics/{id}      → Detalle de una métrica
- POST /api/v1/metrics           → Registrar nueva métrica

Dashboard (KPIs trimestrales desde `analyzed_posts`):
- GET  /api/v1/dashboard/kpis
- GET  /api/v1/dashboard/opportunity-index
- GET  /api/v1/dashboard/market-share-shift
- GET  /api/v1/dashboard/revenue-per-employee

── EJEMPLO (Paso 5 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
Este archivo completo es el ejemplo de referencia para crear un router.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.modules.identity.models import User
from app.modules.metrics import service
from app.modules.metrics.dashboard_schemas import (
    DashboardKPIResponse,
    MarketShareShiftDashboardResponse,
    OpportunityIndexDashboardResponse,
    RevenuePerEmployeeDashboardResponse,
    DeveloperSatisfactionResponse,
    DashboardAlertsResponse,
    RealTimeMonitorResponse,
    DashboardHighlightsResponse,
    AnalyticsInsightsResponse,
    NpsChurnResponse,
    TechnicalFrictionResponse,
    ServiceDraftRequest,
    ServiceDraftResponse,
)
from app.modules.metrics.schemas import (
    MetricCreate,
    MetricHistoryResponse,
    MetricListResponse,
)
from core.database import get_db
from core.security import get_current_active_user

router = APIRouter(prefix="/metrics", tags=["Metrics"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── GET /api/v1/metrics ─────────────────────────────────────────────
@router.get("", response_model=MetricListResponse)
def list_metrics(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0, description="Registros a saltar"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de registros"),
    metric_key: str | None = Query(None, description="Filtrar por clave de métrica"),
):
    """Listar historial de métricas con paginación."""
    items, total = service.get_metrics(
        db, skip=skip, limit=limit, metric_key=metric_key
    )
    return MetricListResponse(items=items, total=total, skip=skip, limit=limit)


# ── GET /api/v1/metrics/{id} ────────────────────────────────────────
@router.get("/{metric_id}", response_model=MetricHistoryResponse)
def get_metric(
    metric_id: int,
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Obtener detalle de una métrica por ID."""
    metric = service.get_metric_detail(db, metric_id)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Métrica no encontrada",
        )
    return metric


# ── POST /api/v1/metrics ────────────────────────────────────────────
@router.post(
    "",
    response_model=MetricHistoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_metric(
    payload: MetricCreate,
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Registrar una nueva entrada de métrica."""
    return service.register_metric(db, payload)


def _dashboard_query_params(
    reference_date: Annotated[
        date | None,
        Query(
            description="Fecha de referencia (solo fecha). Por defecto: hoy. "
            "Se usa para elegir el último trimestre civil ya cerrado.",
        ),
    ] = None,
    quarter: Annotated[
        str | None,
        Query(
            description="Forzar trimestre concreto, formato YYYY-Q1 … YYYY-Q4.",
        ),
    ] = None,
) -> tuple[date | None, str | None]:
    return reference_date, quarter


# ── Dashboard KPIs ───────────────────────────────────────────────────


@dashboard_router.get("/kpis", response_model=DashboardKPIResponse)
def get_dashboard_kpis(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    params: Annotated[tuple[date | None, str | None], Depends(_dashboard_query_params)],
):
    """Opportunity Index, Market Share Shift y Revenue Per Employee (último trimestre cerrado)."""
    reference_date, quarter = params
    try:
        data = service.get_dashboard_kpis(
            db, reference_date=reference_date, quarter=quarter
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return DashboardKPIResponse.model_validate(data)


@dashboard_router.get(
    "/opportunity-index",
    response_model=OpportunityIndexDashboardResponse,
)
def get_opportunity_index(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    params: Annotated[tuple[date | None, str | None], Depends(_dashboard_query_params)],
):
    try:
        data = service.get_opportunity_index_only(
            db, reference_date=params[0], quarter=params[1]
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return OpportunityIndexDashboardResponse.model_validate(data)


@dashboard_router.get(
    "/market-share-shift",
    response_model=MarketShareShiftDashboardResponse,
)
def get_market_share_shift(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    params: Annotated[tuple[date | None, str | None], Depends(_dashboard_query_params)],
):
    try:
        data = service.get_market_share_shift_only(
            db, reference_date=params[0], quarter=params[1]
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return MarketShareShiftDashboardResponse.model_validate(data)


@dashboard_router.get(
    "/revenue-per-employee",
    response_model=RevenuePerEmployeeDashboardResponse,
)
def get_revenue_per_employee(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    engine: str = Query(
        "all",
        description="Engine to filter (unity, unreal, godot, gms2). `all` devuelve el KPI global.",
    ),
    params: Annotated[
        tuple[date | None, str | None], Depends(_dashboard_query_params)
    ] = (None, None),
):
    try:
        if engine.lower() == "all":
            data = service.get_revenue_per_employee_only(
                db, reference_date=params[0], quarter=params[1]
            )
        else:
            from app.modules.metrics.dashboard_by_engine import (
                get_revenue_per_employee_by_engine,
            )

            data = get_revenue_per_employee_by_engine(db, engine)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return RevenuePerEmployeeDashboardResponse.model_validate(data)


# ── Developer Satisfaction Endpoint ──────────────────────────────
@dashboard_router.get(
    "/developer-satisfaction", response_model=DeveloperSatisfactionResponse
)
def get_developer_satisfaction(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    engine: str = Query(
        "unity", description="Engine to evaluate (unity, unreal, godot, gms2)"
    ),
) -> DeveloperSatisfactionResponse:
    """Radar chart data for a selected engine compared against Unity (baseline)."""
    from app.modules.metrics.developer_satisfaction_service import (
        get_developer_satisfaction as _get_dev_sat,
    )

    data = _get_dev_sat(db, engine)
    return DeveloperSatisfactionResponse.model_validate(data)


@dashboard_router.get(
    "/alerts",
    response_model=DashboardAlertsResponse,
)
def get_dashboard_alerts(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    engine: str = Query(
        "all",
        description="Engine to filter (unity, unreal, godot, gms2). `all` devuelve de todos.",
    ),
    limit: int = Query(
        10, ge=1, le=100, description="Cantidad máxima de alertas a devolver."
    ),
):
    """Obtener alertas críticas y altas registradas."""
    from app.modules.metrics.dashboard_alerts_service import get_critical_alerts

    data = get_critical_alerts(db, engine=engine, limit=limit)
    return DashboardAlertsResponse.model_validate(data)


# ── Real-Time Intelligence Monitor ──────────────────────────────────
@dashboard_router.get(
    "/realtime-monitor",
    response_model=RealTimeMonitorResponse,
)
def get_realtime_monitor(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(
        8, ge=1, le=50, description="Cantidad máxima de alertas en el feed."
    ),
    offset: int = Query(
        0, ge=0, le=500, description="Offset para paginación del feed de alertas."
    ),
    category: str = Query(
        "all",
        description="Filtro por categoría de negocio: all, product, finance, positioning, ecosystem, general.",
    ),
):
    """Monitor de Inteligencia Real-Time: conteo de fuentes + feed de alertas desde BD."""
    from app.modules.metrics.realtime_monitor_service import (
        get_realtime_monitor as _get_rt,
    )

    data = _get_rt(db, limit=limit, offset=offset, category=category)
    return RealTimeMonitorResponse.model_validate(data)


# ── Dashboard Highlights ─────────────────────────────────────────────
@dashboard_router.get(
    "/highlights",
    response_model=DashboardHighlightsResponse,
)
def get_dashboard_highlights(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(
        20, ge=1, le=50, description="Cantidad máxima por tipo de highlight."
    ),
    category: str = Query(
        "all",
        description="Filtro por categoría: all, ai, robotic, digital_twins.",
    ),
):
    """Highlights estratégicos y posts destacados para el panel del dashboard."""
    from app.modules.metrics.highlights_service import get_dashboard_highlights as _get_hl

    data = _get_hl(db, limit=limit, category=category)
    return DashboardHighlightsResponse.model_validate(data)


# ── Analytics Insights (Dashboard card) ─────────────────────────────
@dashboard_router.get(
    "/analytics-insights",
    response_model=AnalyticsInsightsResponse,
)
def get_analytics_insights_endpoint(
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(12, ge=1, le=50, description="Cantidad máxima de insights."),
    severity: str | None = Query(
        None,
        description="Filtro por severidad: critical, high, medium, low.",
    ),
    category: str | None = Query(
        None,
        description="Filtro por categoría de negocio: product, finance, positioning, ecosystem, general.",
    ),
    # _: Annotated[User, Depends(get_current_active_user)] = None,  # activar al integrar auth
):
    """Insights estratégicos derivados de analyzed_posts para la card Analytics Insights."""
    from app.modules.metrics.analytics_insights_service import get_analytics_insights

    data = get_analytics_insights(db, limit=limit, severity=severity, category=category)
    return AnalyticsInsightsResponse.model_validate(data)


# ── NPS + Churn Predictor ────────────────────────────────────────────
@dashboard_router.get(
    "/nps-churn",
    response_model=NpsChurnResponse,
    summary="NPS por engine + Churn Predictor para Unity",
    description=(
        "Calcula NPS real desde `analyzed_posts` usando `would_recommend` (promoters/detractors) "
        "y Churn Predictor desde `churn_probability` y `churn_risk`. "
        "NPS se normaliza a escala 0-100 para la UI."
    ),
)
def get_nps_churn(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> NpsChurnResponse:
    """NPS (Unity, Godot, Unreal, industry) y Churn Predictor calculados desde BD."""
    from app.modules.metrics.nps_churn_service import get_nps_churn as _get_nps_churn

    data = _get_nps_churn(db)
    return NpsChurnResponse.model_validate(data)


# ── FIN EJEMPLO Paso 5 ──


# -- Technical Friction Heatmap --------------------------------------
@dashboard_router.get(
    "/technical-friction",
    response_model=TechnicalFrictionResponse,
)
def get_technical_friction_endpoint(
    db: Annotated[Session, Depends(get_db)],
    engine: str = Query("unity", description="Motor a consultar (ej: unity, unreal)"),
    # _: Annotated[User, Depends(get_current_active_user)] = None,
):
    """Obtiene los datos para el mapa de calor de fricción técnica."""
    from app.modules.metrics.technical_friction_service import get_technical_friction

    data = get_technical_friction(db, engine=engine)
    return TechnicalFrictionResponse.model_validate(data)


# ── Service Draft (commercial proposal generator) ───────────────────
@dashboard_router.post(
    "/service-draft",
    response_model=ServiceDraftResponse,
)
def create_service_draft_endpoint(
    body: ServiceDraftRequest,
    db: Annotated[Session, Depends(get_db)],
    # _: Annotated[User, Depends(get_current_active_user)] = None,
):
    """Genera un borrador comercial inteligente desde analyzed_posts."""
    from app.modules.metrics.service_draft_service import generate_service_draft

    try:
        data = generate_service_draft(
            db,
            analyzed_post_id=body.analyzed_post_id,
            source=body.source,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ServiceDraftResponse.model_validate(data)
