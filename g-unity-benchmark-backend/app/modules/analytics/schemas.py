"""Schemas de Analytics para validar los endpoints del dashboard."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class AnalyticsSummaryItem(BaseModel):
    label: str
    value: str
    change: str
    trend: Literal["positive", "negative", "neutral"]
    formula: str | None = None
    description: str | None = None


class MarketShareTrendItem(BaseModel):
    period: str
    month: str
    quarter: str
    unity: float
    unreal: float
    godot: float
    other: float


class PerformanceGapItem(BaseModel):
    metric: str
    unity: float
    unreal: float
    godot: float


class GlobalSentimentNpsItem(BaseModel):
    platform: str
    nps: float
    sentiment_positive: float
    sentiment_neutral: float
    sentiment_negative: float


class GlobalSentimentNpsResponse(BaseModel):
    benchmark_nps: float | None = None
    unity_below_benchmark: bool
    platforms: list[GlobalSentimentNpsItem]


class DeveloperSatisfactionItem(BaseModel):
    year: str
    unity: float | None = None
    unreal: float | None = None
    godot: float | None = None


class MarketShareVsSatisfactionItem(BaseModel):
    segment: str
    label: str
    share: float
    satisfaction: float | None = None
    benchmark: float


class SatisfactionByDimensionItem(BaseModel):
    dimension: str
    unity: float | None = None
    unreal: float | None = None
    godot: float | None = None
    benchmark: float
