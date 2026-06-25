# Unity Nexus 2026 API

Backend de **Unity Nexus 2026 — Global Strategy & Opportunity Hub**. Plataforma de inteligencia competitiva: métricas de mercado, sentimiento de comunidad, oportunidades y análisis asistido por IA.

## 🚀 Quick Start

```bash
git clone <repository-url>
cd g-unity-benchmark-backend
python -m venv .venv && .\.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
cp .env.example .env                                    # Editar con tus valores
alembic upgrade head                                    # Crea tablas + seed
uvicorn main:app --reload --port 8000
```

📖 **Guía detallada** → [manuals/POSTGRES_MIGRATION_GUIDE.md](manuals/POSTGRES_MIGRATION_GUIDE.md)

Documentación interactiva (OpenAPI): `http://localhost:8000/docs`

---

## Tech Stack

| Tecnología | Rol |
|------------|-----|
| Python 3.11+ | Lenguaje |
| FastAPI | Framework web |
| SQLAlchemy 2.0 | ORM |
| Alembic | Migraciones |
| PostgreSQL 16+ | Base de datos (driver `psycopg` v3) |
| Pydantic v2 | Validación y contratos |
| PyJWT + bcrypt | Autenticación |
| slowapi | Rate limiting |

---

## Estructura del Proyecto

```
├── main.py                        # App FastAPI, CORS, routers
├── core/
│   ├── config.py                  # Settings (env-driven)
│   ├── database.py                # Engine, Session, get_db
│   └── security.py                # JWT, hashing, auth deps
├── app/
│   ├── db/
│   │   ├── base.py                # Registro central de modelos ORM
│   │   └── mixins.py              # TimestampMixin
│   └── modules/
│       ├── identity/              # ✅ Auth, users, roles, logs
│       ├── market_intelligence/   # 🔲 Posts analizados
│       ├── metrics/               # 🔲 Historial de KPIs
│       ├── assistant/             # 🔲 Chat IA
│       ├── alerts/                # 🔲 Alertas
│       ├── opportunities/         # 🔲 Oportunidades
│       └── simulation/            # 🔲 Escenarios what-if
├── alembic/                       # Migraciones
├── manuals/                       # Guías paso a paso
├── schema.sql                     # DDL de referencia
└── requirements.txt
```

> Cada módulo sigue el flujo `router → service → crud → models`. Ver las reglas del agente para convenciones detalladas.

---

## Base de Datos — 7 tablas

| Tabla | Módulo | Descripción |
|-------|--------|-------------|
| `roles` | Identity | Catálogo de roles |
| `users` | Identity | Usuarios (UUID, CITEXT email) |
| `logs` | Identity | Auditoría append-only |
| `posts` | Market Intelligence | Contenido analizado (sentimiento, NPS, churn) |
| `metric_history` | Metrics | Historial de KPIs (JSONB) |
| `chat_history` | Assistant | Mensajes por thread |
| `alerts` | Alerts | Alertas con severidad |

Extensiones: `pgcrypto`, `citext`.

---

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [POSTGRES_MIGRATION_GUIDE.md](manuals/POSTGRES_MIGRATION_GUIDE.md) | Setup de BD y migraciones |
| [ENDPOINT_IMPLEMENTATION_GUIDE.md](manuals/ENDPOINT_IMPLEMENTATION_GUIDE.md) | Cómo implementar endpoints nuevos |
| [ARCHITECTURE.md](manuals/ARCHITECTURE.md) | Arquitectura detallada del backend |
| [GIT_HOOKS.md](GIT_HOOKS.md) | Git hooks y branch protection |
| OpenAPI (`/docs`) | Referencia interactiva de la API |
