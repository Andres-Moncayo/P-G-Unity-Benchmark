"""Esquemas Pydantic para el flujo de chat (entrada HTTP y respuestas de conversación)."""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.llm import ChatMessageResponse


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Mensaje o pregunta del usuario.")
    conversation_id: str | None = Field(
        default=None,
        description="Si se omite, se crea una nueva conversación.",
    )
    deep_analysis: bool = Field(default=False)
    comparative_mode: bool = Field(default=False)
    stream: bool = Field(default=False)


class ChatFeedbackRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1)
    message_id: str = Field(..., min_length=1)
    feedback: Literal["positive", "negative"]


class ChatSourceItem(BaseModel):
    title: str
    url: str


class ChatVisualData(BaseModel):
    chart_type: str
    title: str = ""
    labels: list[str] = Field(default_factory=list)
    values: list[float] = Field(default_factory=list)
    unit: str = "%"


class ChatMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    sources: list[ChatSourceItem] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    visual_data: ChatVisualData | None = None
    confidence: float | None = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    messages: list[ChatMessageOut]
    simulation: dict[str, Any] | None = Field(
        default=None,
        description="Última corrida del simulador persistida en esta conversación (si existe).",
    )


class ChatPostResponse(ChatMessageResponse):
    conversation_id: str = Field(..., description="Identificador de la conversación.")
    title: str = Field(..., description="Título actual de la conversación.")
    assistant_message_id: str = Field(..., description="Id del mensaje del asistente en BD.")
    visual_data: ChatVisualData | None = Field(default=None)