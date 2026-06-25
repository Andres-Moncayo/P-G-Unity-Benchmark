"""Lógica de negocio de Simulation.

Calcula proyecciones what-if a partir de un valor base y un modelo:

- ``exponential``: ``v_t = v0 * (1 + r) ** t``
- ``linear``:      ``v_t = v0 * (1 + r * t)``
- ``logistic``:    ``v_t = K / (1 + ((K - v0) / v0) * e^(-r * t))``

Las proyecciones siempre incluyen ``t = 0`` (año base) y avanzan ``years``
puntos adicionales.
"""
from __future__ import annotations

import math
from datetime import datetime
from typing import Literal

ModelType = Literal["exponential", "linear", "logistic"]


SCENARIO_BY_RATE = (
    (-0.99, -0.01, "Recesión"),
    (-0.01, 0.03, "Estancamiento"),
    (0.03, 0.09, "Conservador"),
    (0.09, 0.16, "Base"),
    (0.16, 0.30, "Agresivo"),
    (0.30, 2.0, "Hipergrowth"),
)


def auto_scenario_label(growth_rate: float) -> str:
    """Etiqueta legible para la tasa anual."""
    for lo, hi, label in SCENARIO_BY_RATE:
        if lo <= growth_rate < hi:
            return label
    return "Personalizado"


def compute_projections(
    *,
    baseline_value: float,
    years: int,
    growth_rate: float,
    model_type: ModelType,
    capacity: float | None = None,
) -> list[dict]:
    """Devuelve `years + 1` puntos (incluyendo año 0 actual)."""
    if years < 1:
        raise ValueError("years debe ser >= 1")

    base_year = datetime.utcnow().year

    if model_type == "exponential":
        return [
            {"year": base_year + t, "projected_value": _round(baseline_value * ((1 + growth_rate) ** t))}
            for t in range(years + 1)
        ]

    if model_type == "linear":
        return [
            {"year": base_year + t, "projected_value": _round(max(0.0, baseline_value * (1 + growth_rate * t)))}
            for t in range(years + 1)
        ]

    if model_type == "logistic":
        # Si no se pasa capacity, asumimos 3x el valor base como techo.
        k = capacity if capacity and capacity > baseline_value else baseline_value * 3.0
        denominator_factor = max(1e-9, (k - baseline_value) / max(baseline_value, 1e-9))
        return [
            {
                "year": base_year + t,
                "projected_value": _round(k / (1 + denominator_factor * math.exp(-growth_rate * t))),
            }
            for t in range(years + 1)
        ]

    raise ValueError(f"model_type no soportado: {model_type}")


def _round(value: float) -> float:
    return round(float(value), 4)
