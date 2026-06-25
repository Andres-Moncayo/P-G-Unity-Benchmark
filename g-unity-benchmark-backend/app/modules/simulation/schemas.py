"""DTOs Pydantic del bounded context Simulation."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ModelType = Literal["exponential", "linear", "logistic"]


class CompanySearchResult(BaseModel):
    """Resultado de búsqueda de empresa por nombre."""

    id: int
    name: str
    slug: str
    baseline_metric: str
    baseline_value: float
    baseline_unit: str

    model_config = ConfigDict(from_attributes=True)


class CompanyOut(CompanySearchResult):
    """Vista pública completa de la empresa (mismos campos + descripción/estado)."""

    description: str | None = None
    is_active: bool = True


class ProjectionPoint(BaseModel):
    """Un punto en la proyección anual."""

    year: int
    projected_value: float = Field(..., ge=0)


class SimulationRunRequest(BaseModel):
    """Payload de POST /simulation/run."""

    company_id: int = Field(..., ge=1)
    years: int = Field(..., ge=1, le=30)
    growth_rate: float = Field(..., ge=-1.0, le=2.0, description="Decimal anual; 0.10 = 10%.")
    model_type: ModelType = "exponential"
    persist: bool = True
    conversation_id: str | None = Field(
        default=None,
        description="Si se indica junto con persist, guarda la corrida en chat_conversations.state.",
    )
    scenario: str | None = Field(default=None, max_length=60)
    capacity: float | None = Field(
        default=None,
        gt=0,
        description="Techo asintótico para el modelo logistic; ignorado en otros modelos.",
    )


class SimulationRunResponse(BaseModel):
    """Salida de POST /simulation/run."""

    id: str | None = Field(default=None, description="UUID si la corrida se persistió; null en caso contrario.")
    company_id: int
    company_name: str
    scenario: str
    model_type: ModelType
    growth_rate: float
    years: int
    baseline_value: float
    baseline_unit: str
    projections: list[ProjectionPoint]
    persisted: bool = False
    created_at: datetime | None = None
