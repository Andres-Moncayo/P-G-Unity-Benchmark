"""Router de Simulation: compañías en memoria; persistencia opcional en chat_conversations.state."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.modules.chat.models import ChatConversation
from app.modules.identity.models import User
from core.database import get_postgres_db
from core.security import get_current_active_user
from app.modules.simulation import crud
from app.modules.simulation.schemas import (
    CompanyOut,
    CompanySearchResult,
    ProjectionPoint,
    SimulationRunRequest,
    SimulationRunResponse,
)
from app.modules.simulation.service import auto_scenario_label, compute_projections

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulation", tags=["Simulation"])


def _persist_simulation_state(
    pg_db: Session,
    *,
    conversation_id: str,
    user_id: uuid.UUID,
    last_run: dict[str, Any],
    request_meta: dict[str, Any],
) -> bool:
    conv = (
        pg_db.query(ChatConversation)
        .filter(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
        .one_or_none()
    )
    if conv is None:
        return False
    raw = conv.state if isinstance(conv.state, dict) else {}
    msgs = raw.get("messages") if isinstance(raw.get("messages"), list) else []
    now = datetime.now(timezone.utc).isoformat()
    new_state = {
        **raw,
        "messages": msgs,
        "simulation": {"last_run": last_run, "request": request_meta, "updated_at": now},
    }
    conv.state = new_state
    flag_modified(conv, "state")
    conv.updated_at = datetime.now(timezone.utc)
    try:
        pg_db.commit()
        return True
    except Exception as exc:
        pg_db.rollback()
        logger.exception("simulation: no se pudo persistir en conversación: %s", exc)
        return False


@router.get("/companies", response_model=list[CompanyOut])
def list_simulation_companies(
    pg_db: Annotated[Session, Depends(get_postgres_db)],
) -> list[CompanyOut]:
    companies = crud.list_companies(pg_db)
    return [CompanyOut.model_validate(c) for c in companies]


@router.get("/companies/search", response_model=CompanySearchResult)
def search_simulation_company(
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    name: Annotated[str, Query(min_length=1, description="Nombre o slug de la empresa.")],
) -> CompanySearchResult:
    company = crud.find_company_by_name(pg_db, name)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ninguna empresa que coincida con '{name}'.",
        )
    return CompanySearchResult.model_validate(company)


@router.post("/run", response_model=SimulationRunResponse)
def run_simulation(
    body: SimulationRunRequest,
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SimulationRunResponse:
    company = crud.get_company_by_id(pg_db, body.company_id)
    if company is None or not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con id={body.company_id} no existe o está inactiva.",
        )

    try:
        projections = compute_projections(
            baseline_value=float(company.baseline_value),
            years=body.years,
            growth_rate=body.growth_rate,
            model_type=body.model_type,
            capacity=body.capacity,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    scenario_label = body.scenario or auto_scenario_label(body.growth_rate)

    run_id: str | None = None
    created_at: datetime | None = None
    persisted = False

    if body.persist and body.conversation_id:
        run_id = uuid.uuid4().hex
        created_at = datetime.now(timezone.utc)
        last_run: dict[str, Any] = {
            "id": run_id,
            "company_id": company.id,
            "company_name": company.name,
            "scenario": scenario_label,
            "model_type": body.model_type,
            "growth_rate": body.growth_rate,
            "years": body.years,
            "baseline_value": float(company.baseline_value),
            "baseline_unit": company.baseline_unit,
            "projections": projections,
            "persisted": True,
            "created_at": created_at.isoformat(),
        }
        req_meta = {
            "company_id": body.company_id,
            "years": body.years,
            "growth_rate": body.growth_rate,
            "model_type": body.model_type,
            "scenario": body.scenario,
        }
        persisted = _persist_simulation_state(
            pg_db,
            conversation_id=body.conversation_id,
            user_id=current_user.id,
            last_run=last_run,
            request_meta=req_meta,
        )
        if not persisted:
            run_id = None
            created_at = None

    return SimulationRunResponse(
        id=run_id,
        company_id=company.id,
        company_name=company.name,
        scenario=scenario_label,
        model_type=body.model_type,
        growth_rate=body.growth_rate,
        years=body.years,
        baseline_value=float(company.baseline_value),
        baseline_unit=company.baseline_unit,
        projections=[ProjectionPoint(**p) for p in projections],
        persisted=persisted,
        created_at=created_at,
    )
