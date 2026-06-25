"""Errores de dominio para el módulo analytics."""
from __future__ import annotations


class AnalyticsDatabaseUnavailable(Exception):
    """La base de datos no responde (timeout, host caído, credenciales, red, etc.)."""

    DEFAULT_MESSAGE = (
        "No se pudo conectar a la base de datos. "
        "Comprueba que PostgreSQL esté activo y que DATABASE_URL en .env sea correcta."
    )

    def __init__(self, message: str | None = None, *, cause: BaseException | None = None) -> None:
        self.message = message or self.DEFAULT_MESSAGE
        self.cause = cause
        super().__init__(self.message)

    def detail_payload(self) -> dict[str, str]:
        return {"code": "database_unavailable", "message": self.message}
