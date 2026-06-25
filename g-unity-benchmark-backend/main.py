import logging
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import OperationalError

from app.modules.alerts import router as alerts_router
from app.modules.analytics.exceptions import AnalyticsDatabaseUnavailable
from app.modules.analytics.router import router as analytics_router
from app.modules.assistant import router as assistant_router
from app.modules.chat import router as chat_router
from app.modules.competitors import router as competitors_router
from app.modules.data_miners.router import router as data_miners_router
from app.modules.tech_trends.router import router as tech_trends_router
from app.modules.identity import router as identity_router
from app.modules.market_intelligence import router as market_intelligence_router
from app.modules.metrics import router as metrics_router
from app.modules.metrics.router import dashboard_router
from app.modules.monitorization import router as monitorization_router
from app.modules.opportunities import router as opportunities_router
from app.modules.simulation import router as simulation_router
from core.config import settings
from core.database import verify_database_connection
from core.limiter import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Unity Nexus 2026",
    swagger_ui_parameters={"persistAuthorization": True},
)


@app.on_event("startup")
def verify_db_on_startup() -> None:
    """Confirma en arranque que DATABASE_URL apunta a una BD accesible."""
    try:
        verify_database_connection()
        logger.info("PostgreSQL conectado: %s", settings.database_host_label)
    except Exception as exc:
        logger.error(
            "No se pudo conectar a PostgreSQL (%s): %s",
            settings.database_host_label,
            exc,
        )

base_desc = "Esta es la descripción base de mi API."


base_desc = "Unity Nexus 2026 — Global Strategy & Opportunity Hub. Plataforma de inteligencia competitiva."


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description=base_desc + "\n\n### Autenticación en `/docs`\n"
        "1. Pulsa **Authorize** (candado).\n"
        "2. En **username** escribe el **email completo** del usuario (no un alias corto).\n"
        "3. En **password** la contraseña de ese usuario.\n"
        "4. Tras autorizar, las peticiones envían `Authorization: Bearer …`.\n"
        "5. Con `ENVIRONMENT=development`, **GET /identity/users** admite cualquier usuario autenticado; "
        "en staging/production solo **admin**.\n"
        "6. Crear/editar usuarios y **GET /roles** siguen exigiendo rol **admin**.\n",
        routes=app.routes,
    )
    schemes = openapi_schema.setdefault("components", {}).setdefault(
        "securitySchemes", {}
    )
    for _name, scheme in schemes.items():
        if isinstance(scheme, dict) and scheme.get("type") == "oauth2":
            scheme["description"] = (
                "**username** = email en base de datos (ej. `admin@unitynexus.com`). "
                "**password** = contraseña de ese usuario. "
                "Rutas de administración exigen rol **admin** (`roles.slug = admin`)."
            )
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.on_event("startup")
def _bootstrap_community_tables() -> None:
    """Crea tablas PgBase (chat, ia_posts) y asegura columna state en chat_conversations."""
    from sqlalchemy import text

    from app.db.pg_base import PgBase
    from core.database import _postgres_engine
    import app.modules.chat.models  # noqa: F401
    import app.modules.data_miners.models  # noqa: F401
    try:
        PgBase.metadata.create_all(bind=_postgres_engine)
        logger.info("PgBase tables ensured (chat_conversations, analyzed_posts).")
    except Exception as exc:
        logger.exception("No se pudieron crear/verificar tablas PostgreSQL comunidad/IA: %s", exc)
        return

    try:
        with _postgres_engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS "
                    "state JSONB NOT NULL DEFAULT '{}'::jsonb"
                )
            )
            # Tabla legacy del modelo ChatMessage (mensajes viven en chat_conversations.state).
            legacy = conn.execute(
                text(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = 'chat_messages'"
                )
            ).scalar()
            if legacy:
                conn.execute(text("DROP TABLE chat_messages"))
                logger.info("Removed legacy table chat_messages (messages use chat_conversations.state).")
            user_id_type = conn.execute(
                text(
                    "SELECT data_type FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = 'chat_conversations' "
                    "AND column_name = 'user_id'"
                )
            ).scalar()
            if user_id_type and user_id_type != "uuid":
                logger.info(
                    "Migrating chat_conversations.user_id from %s to uuid (legacy rows removed).",
                    user_id_type,
                )
                conn.execute(text("DELETE FROM chat_conversations"))
                conn.execute(text("ALTER TABLE chat_conversations DROP COLUMN user_id"))
                conn.execute(text("ALTER TABLE chat_conversations ADD COLUMN user_id UUID NOT NULL"))
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_chat_conversations_user_id "
                        "ON chat_conversations (user_id)"
                    )
                )
    except Exception as exc:
        logger.warning("Could not ensure chat_conversations schema / drop legacy chat_messages: %s", exc)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests"})


@app.exception_handler(AnalyticsDatabaseUnavailable)
async def analytics_database_unavailable_handler(
    request: Request, exc: AnalyticsDatabaseUnavailable
):
    logger.error("Analytics DB unavailable: %s", exc.message)
    return JSONResponse(status_code=503, content={"detail": exc.detail_payload()})


@app.exception_handler(OperationalError)
async def database_unavailable_handler(request: Request, exc: OperationalError):
    logger.exception("DB Error")
    return JSONResponse(status_code=503, content={"detail": "DB connection error"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://9b26lkv9-5173.use2.devtunnels.ms",
    ],
    # Any localhost / 127.0.0.1 port (Vite may pick a free port)
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


# --- REGISTRO DE RUTAS ---

# 1. Rutas V1 (identidad, métricas, etc.)
api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(identity_router)
api_v1.include_router(market_intelligence_router)
api_v1.include_router(metrics_router)
api_v1.include_router(dashboard_router)
api_v1.include_router(opportunities_router)
api_v1.include_router(simulation_router)
api_v1.include_router(assistant_router)
api_v1.include_router(alerts_router)

api_v1.include_router(chat_router.router)
api_v1.include_router(monitorization_router)
api_v1.include_router(competitors_router.router)
api_v1.include_router(data_miners_router)
api_v1.include_router(tech_trends_router)


app.include_router(api_v1)

# 2. Analytics bajo /api (sin v1)
analytics_api = APIRouter(prefix="/api")
analytics_api.include_router(analytics_router, prefix="/analytics")
app.include_router(analytics_api)



# ── Health check (sin versionado, lo usan probes y monitoreo) ────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
