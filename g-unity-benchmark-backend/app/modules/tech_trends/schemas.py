# from __future__ import annotations

# import enum
# from datetime import datetime
# from typing import Generic, TypeVar

# from pydantic import BaseModel, ConfigDict, Field

# T = TypeVar("T")


# class TechCategory(str, enum.Enum):
#     robotic = "Robotic"
#     ai = "AI"
#     digital_twins = "Digital twins"


# class PostHighlight(BaseModel):
#     id: int | None = None
#     title: str | None = None
#     summary: str | None = None
#     url: str | None = None
#     date: datetime | None = None
#     game_engine: str | None = None
#     category: TechCategory | None = None

#     model_config = ConfigDict(from_attributes=True)


# class Highlight(BaseModel):
#     id: int | None = None
#     title: str | None = None
#     content: str | None = None
#     game_engine: str | None = None
#     category: TechCategory | None = None

#     model_config = ConfigDict(from_attributes=True)


# class PostHighlightsResponse(BaseModel):
#     items: list[PostHighlight] = Field(default_factory=list)


# class HighlightsResponse(BaseModel):
#     items: list[Highlight] = Field(default_factory=list)


# class ScrapeRequest(BaseModel):
#     limit: int = Field(default=12, ge=1, le=50)
#     days: int = Field(default=365, ge=1, le=3650)


# class SummarizeRequest(BaseModel):
#     category: TechCategory | None = None
#     game_engine: str | None = None
#     min_posts: int = Field(default=2, ge=1, le=100)


# class PostsHighlightsPayload(BaseModel):
#     posts: list[PostHighlight] = Field(default_factory=list)


# class ExecutiveHighlightPayload(BaseModel):
#     highlight: Highlight


# class PaginatedResponse(BaseModel, Generic[T]):
#     data: list[T]
#     total_pages: int
#     count: int
#     total_count: int
#     limit: int
#     offset: int



from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Generic, TypeVar

# Se importa field_validator para corregir las minúsculas de la IA
from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")


class TechCategory(str, enum.Enum):
    Robotic = "Robotic"
    AI = "AI"
    Digital_twins = "Digital twins"


class PostHighlight(BaseModel):
    id: int | None = None
    title: str | None = None
    summary: str | None = None
    url: str | None = None
    date: datetime | None = None
    game_engine: str | None = None
    category: TechCategory | None = None

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    # === NORMALIZADOR DE MAYÚSCULAS PARA LA IA ===
    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_case(cls, value: Any) -> Any:
        if isinstance(value, str):
            val_lower = value.lower()
            if val_lower == "robotic":
                return TechCategory.Robotic
            elif val_lower == "ai":
                return TechCategory.AI
            elif val_lower in ["digital twins", "digital_twins", "digital twin"]:
                return TechCategory.Digital_twins
        return value


class Highlight(BaseModel):
    id: int | None = None
    title: str | None = None
    content: str | None = None
    game_engine: str | None = None
    category: TechCategory | None = None

    model_config = ConfigDict(from_attributes=True)

    # === NORMALIZADOR DE MAYÚSCULAS PARA LA IA ===
    @field_validator("category", mode="before")
    @classmethod
    def normalize_category_case(cls, value: Any) -> Any:
        if isinstance(value, str):
            val_lower = value.lower()
            if val_lower == "robotic":
                return TechCategory.Robotic
            elif val_lower == "ai":
                return TechCategory.AI
            elif val_lower in ["digital twins", "digital_twins", "digital twin"]:
                return TechCategory.Digital_twins
        return value


class PostHighlightsResponse(BaseModel):
    items: list[PostHighlight] = Field(default_factory=list)


class HighlightsResponse(BaseModel):
    items: list[Highlight] = Field(default_factory=list)


class ScrapeRequest(BaseModel):
    limit: int = Field(default=12, ge=1, le=50)
    days: int = Field(default=365, ge=1, le=3650)


class SummarizeRequest(BaseModel):
    category: TechCategory | None = None
    game_engine: str | None = None
    min_posts: int = Field(default=2, ge=1, le=100)


class PostsHighlightsPayload(BaseModel):
    posts: list[PostHighlight] = Field(default_factory=list)


class ExecutiveHighlightPayload(BaseModel):
    highlight: Highlight


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total_pages: int
    count: int
    total_count: int
    limit: int
    offset: int

