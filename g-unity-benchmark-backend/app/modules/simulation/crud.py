"""Catálogo del simulador en memoria (sin tablas propias en PostgreSQL)."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session


@dataclass(frozen=True)
class SimCompanyRow:
    id: int
    name: str
    slug: str
    baseline_metric: str
    baseline_value: float
    baseline_unit: str
    description: str | None = None
    is_active: bool = True


_COMPANIES: tuple[SimCompanyRow, ...] = (
    SimCompanyRow(
        id=1,
        name="Unity",
        slug="unity",
        baseline_metric="revenue",
        baseline_value=569.0,
        baseline_unit="M USD",
        description="Unity Technologies — motor multiplataforma líder en mobile e indie.",
    ),
    SimCompanyRow(
        id=2,
        name="Unity Technologies",
        slug="unity-technologies",
        baseline_metric="revenue",
        baseline_value=569.0,
        baseline_unit="M USD",
        description="Alias formal de la compañía pública Unity (mismo baseline que 'Unity').",
    ),
    SimCompanyRow(
        id=3,
        name="Epic Games",
        slug="epic-games",
        baseline_metric="revenue",
        baseline_value=1450.0,
        baseline_unit="M USD",
        description="Creadores de Unreal Engine y Fortnite.",
    ),
    SimCompanyRow(
        id=4,
        name="Godot Foundation",
        slug="godot-foundation",
        baseline_metric="downloads",
        baseline_value=6.6,
        baseline_unit="M descargas",
        description="Fundación detrás del motor open source Godot.",
    ),
    SimCompanyRow(
        id=5,
        name="AppLovin",
        slug="applovin",
        baseline_metric="revenue",
        baseline_value=1230.0,
        baseline_unit="M USD",
        description="Plataforma de monetización mobile, competidora de Unity Vector AI.",
    ),
    SimCompanyRow(
        id=6,
        name="Roblox",
        slug="roblox",
        baseline_metric="revenue",
        baseline_value=919.0,
        baseline_unit="M USD",
        description="Plataforma UGC competidora indirecta de Unity en gaming social.",
    ),
)


def list_companies(_db: Session, *, limit: int = 50) -> list[SimCompanyRow]:
    return [c for c in _COMPANIES if c.is_active][:limit]


def get_company_by_id(_db: Session, company_id: int) -> SimCompanyRow | None:
    for c in _COMPANIES:
        if c.id == company_id:
            return c
    return None


def find_company_by_name(_db: Session, name: str) -> SimCompanyRow | None:
    trimmed = (name or "").strip()
    if not trimmed:
        return None
    active = [c for c in _COMPANIES if c.is_active]
    lowered = trimmed.casefold()

    def exact(c: SimCompanyRow) -> bool:
        return c.name.casefold() == lowered or c.slug.casefold() == lowered

    def prefix(c: SimCompanyRow) -> bool:
        return c.name.casefold().startswith(lowered) or c.slug.casefold().startswith(lowered)

    def substr(c: SimCompanyRow) -> bool:
        return lowered in c.name.casefold() or lowered in c.slug.casefold()

    for pred in (exact, prefix, substr):
        matches = [c for c in active if pred(c)]
        if matches:
            return sorted(matches, key=lambda x: x.name)[0]
    return None
