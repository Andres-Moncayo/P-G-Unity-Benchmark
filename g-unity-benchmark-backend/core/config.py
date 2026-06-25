from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ── Cálculo de Ruta Raíz ─────────────────────────────────────────────
# Detecta automáticamente la carpeta del proyecto (parent del módulo `core`).
BASE_DIR = Path(__file__).resolve().parent.parent


def _parse_env_list(value: object) -> object:
    """Acepta listas JSON, CSV o listas nativas desde variables de entorno."""
    if value is None:
        return value
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        if stripped.startswith("["):
            try:
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass
        return [item.strip() for item in stripped.split(",") if item.strip()]
    return value


class Settings(BaseSettings):
    """Configuración global de la aplicación.
    Se carga desde variables de entorno (.env).

    La conexión a PostgreSQL se define en ``DATABASE_URL`` (Neon, local, etc.).
    Las variables ``POSTGRES_*`` son opcionales y solo se usan para documentar
    o construir la URL cuando ``DATABASE_URL`` no está definida.
    """

    PROJECT_NAME: str = "Unity Nexus 2026 API"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # ── CORS ─────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://9b26lkv9-5173.use2.devtunnels.ms"
    ]

    # ── Database principal (PostgreSQL — app/negocio) ────────────────
    DATABASE_URL: str = Field(
        default="",
        description="URL completa de conexión a DB (postgresql+psycopg://user:pwd@host:5432/db)",
    )

    # ── Parámetros opcionales de PostgreSQL ──────────────────────────
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: int = 5432

    DB_POOL_PRE_PING: bool = True
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_CONNECT_TIMEOUT: int = 15

    # ── Database comunidad/IA (Aiven PostgreSQL — chat y posts) ──────
    # Si no se define, se reutiliza DATABASE_URL (misma instancia).
    POSTGRES_URL: Optional[str] = None

    # ── JWT / Seguridad ──────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # ── Identity rules ───────────────────────────────────────────────
    ALLOWED_EMAIL_DOMAINS: list[str] = ["unitynexus.com", "globant.com"]

    # ── Bootstrap ────────────────────────────────────────────────────
    INITIAL_ADMIN_EMAIL: str = "admin@unitynexus.com"
    INITIAL_ADMIN_PASSWORD: str = "Admin123Change!"
    INITIAL_ADMIN_FULL_NAME: str = "Platform Admin"

    # ── IA / Search ──────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"

    # ── Data Miners key pool (se asume que se cargan desde el entorno) ──
    TAVILY_KEY_1: Optional[str] = None
    TAVILY_KEY_2: Optional[str] = None
    TAVILY_KEY_3: Optional[str] = None
    TAVILY_KEY_4: Optional[str] = None
    TAVILY_KEY_5: Optional[str] = None
    TAVILY_KEY_6: Optional[str] = None
    TAVILY_KEY_7: Optional[str] = None
    TAVILY_KEY_8: Optional[str] = None
    TAVILY_KEY_9: Optional[str] = None
    TAVILY_KEY_10: Optional[str] = None

    GEMINI_KEY_1: Optional[str] = None
    GEMINI_KEY_2: Optional[str] = None
    GEMINI_KEY_3: Optional[str] = None
    GEMINI_KEY_4: Optional[str] = None
    GEMINI_KEY_5: Optional[str] = None
    GEMINI_KEY_6: Optional[str] = None
    GEMINI_KEY_7: Optional[str] = None
    GEMINI_KEY_8: Optional[str] = None
    GEMINI_KEY_9: Optional[str] = None
    GEMINI_KEY_10: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Validadores y Correcciones Dinámicas ─────────────────────────

    @field_validator("CORS_ORIGINS", "ALLOWED_EMAIL_DOMAINS", mode="before")
    @classmethod
    def _normalize_list_fields(cls, value: object) -> object:
        """Utiliza la función global para parsear listas desde el .env"""
        return _parse_env_list(value)

    @model_validator(mode="after")
    def _ensure_database_url(self) -> Settings:
        url = (self.DATABASE_URL or "").strip()
        if url:
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg://", 1)
            elif url.startswith("postgresql://") and "+psycopg" not in url:
                url = url.replace("postgresql://", "postgresql+psycopg://", 1)
            object.__setattr__(self, "DATABASE_URL", url)
            return self

        if self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_DB:
            host = self.POSTGRES_HOST or "localhost"
            user = quote_plus(self.POSTGRES_USER)
            password = quote_plus(self.POSTGRES_PASSWORD)
            built = (
                f"postgresql+psycopg://{user}:{password}@"
                f"{host}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
            object.__setattr__(self, "DATABASE_URL", built)
            return self

        raise ValueError(
            "DATABASE_URL es obligatoria (o define POSTGRES_USER, POSTGRES_PASSWORD, "
            "POSTGRES_DB y opcionalmente POSTGRES_HOST)."
        )

    @property
    def database_host_label(self) -> str:
        """Host de la BD para logs (sin credenciales)."""
        url = self.DATABASE_URL
        if "@" not in url:
            return "unknown"
        return url.split("@", 1)[1].split("/", 1)[0]

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        """Fuerza driver psycopg v3 y resuelve `ca.pem` relativo si aplica.

        - postgres:// y postgresql:// → postgresql+psycopg://
        - sslrootcert=ca.pem → ruta absoluta del repo
        """
        url = value.strip()
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        elif url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://"):]
        if "sslrootcert=ca.pem" in url:
            ca_path = str(BASE_DIR / "ca.pem")
            url = url.replace("ca.pem", ca_path)
        return url


# Instancia global
settings = Settings()