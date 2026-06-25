# Arquitectura Backend — Unity Nexus 2026

## 1. Propósito del documento

Documento de arquitectura vivo del equipo **Backend** dentro del proyecto **Unity Nexus 2026 — Global Strategy & Opportunity Hub**.

El proyecto completo involucra tres frentes:

- **Backend** (este equipo): base de datos, API, persistencia, contratos, seguridad.
- **AI Search**: análisis semántico, scraping, procesamiento de fuentes externas.
- **AI Chat**: asistente conversacional, prompt engineering, generación de respuestas.

Este documento define lo que **Backend construye y mantiene**.

---

## 2. Alcance del equipo Backend

### Responsabilidades

- Mantener la base de datos PostgreSQL y migraciones Alembic.
- Mantener la arquitectura modular DDD ligero.
- Crear y mantener endpoints versionados bajo `/api/v1`.
- Persistir métricas, posts, conversaciones, alertas y datos de negocio.
- Exponer datos de forma clara para el frontend.
- Definir contratos JSON para AI Search y AI Chat.
- Autenticación, autorización y seguridad.

### NO es responsabilidad del Backend

- Entrenar modelos de IA.
- Elegir modelos NLP (RoBERTa, Llama, etc.).
- Mejorar prompting del asistente.
- Implementar lógica semántica avanzada de búsqueda.
- Construir la interfaz visual (dashboard, chat UI).
- Hacer scraping profundo (eso queda en AI Search).

Backend **habilita** esas funcionalidades mediante endpoints, tablas y contratos.

---

## 3. Enfoque arquitectónico: DDD ligero

Se usa **DDD ligero**, no DDD completo. Esto significa:

- Organizar por **bounded contexts** (módulos funcionales).
- Estructura simple y consistente por módulo.
- Separar lógica de negocio de los routers.
- Evitar sobreingeniería.
- Reutilizar FastAPI, SQLAlchemy, Alembic, Pydantic y JWT.

### Flujo por módulo

```text
router → service → crud → models
```

| Archivo | Responsabilidad |
|---------|----------------|
| `router.py` | Endpoints HTTP, dependencias, auth, delegación |
| `schemas.py` | Contratos Pydantic de entrada/salida |
| `models.py` | Modelos SQLAlchemy ORM |
| `crud.py` | Consultas directas a base de datos |
| `service.py` | Orquestación, reglas de negocio, transformación |

### Lo que NO se implementa

- Agregados complejos.
- Domain events.
- Value objects extensivos.
- Repositories abstractos innecesarios.
- CQRS / Event sourcing.

---

## 4. Módulos Backend

### Estructura de carpetas

```text
app/
  db/
    base.py          # Registro central de TODOS los modelos ORM
    mixins.py        # TimestampMixin
  modules/
    identity/        # ✅ Operativo
    metrics/         # 🔲 Placeholder
    market_intelligence/  # 🔲 Placeholder
    opportunities/   # 🔲 Placeholder (sin tablas)
    simulation/      # 🔲 Placeholder (sin tablas)
    assistant/       # 🔲 Placeholder
    alerts/          # 🔲 Placeholder
core/
  config.py
  database.py
  security.py
```

### 4.1 Identity ✅

**Estado**: Operativo — router, service, crud, schemas completos.

**Responsabilidad**:
- Login, refresh token.
- Gestión de usuarios (CRUD admin).
- Roles (admin / user).
- Validación de usuario activo.
- Restricción de dominio de email.
- Auditoría de acciones (tabla `logs`).

**Tablas**: `roles`, `users`, `logs`.

### 4.2 Market Intelligence 🔲

**Estado**: Placeholder — router registrado, modelo ORM listo, sin endpoints.

**Responsabilidad**:
- Almacenar posts analizados (sentimiento, bugs, performance, churn, NPS).
- Exponer datos al frontend y a otros módulos.

**Tablas**: `posts`.

### 4.3 Metrics 🔲

**Estado**: Placeholder — router registrado, modelo ORM listo, sin endpoints.

**Responsabilidad**:
- Historial de KPIs con dimensiones flexibles (JSONB).
- Series temporales de métricas.
- Datos para dashboard, simulation y AI Chat.

**Tablas**: `metric_history`.

### 4.4 Assistant 🔲

**Estado**: Placeholder — router registrado, modelo ORM listo, sin endpoints.

**Responsabilidad**:
- Historial de chat (agrupado por thread_id).
- Mensajes con rol (user / assistant / system).
- Citas y modelo IA usado.

**Tablas**: `chat_history`.

### 4.5 Alerts 🔲

**Estado**: Placeholder — router registrado, modelo ORM listo, sin endpoints.

**Responsabilidad**:
- Alertas con severidad (low / middle / high).
- Estado de lectura.
- Asociación con posts.

**Tablas**: `alerts`.

### 4.6 Opportunities 🔲

**Estado**: Placeholder — router registrado, sin tablas ni modelo.

**Responsabilidad futura**:
- Oportunidades detectadas.
- Scores.
- Service drafts.

### 4.7 Simulation 🔲

**Estado**: Placeholder — router registrado, sin tablas ni modelo.

**Responsabilidad futura**:
- Escenarios what-if.
- Resultados de simulación.
- Persistencia de inputs y outputs.

---

## 5. Base de datos PostgreSQL

### Extensiones

- `pgcrypto`: `gen_random_uuid()` para UUIDs.
- `citext`: email case-insensitive.

### Schema actual (migración 001) — 7 tablas

| Tabla | Módulo | PK | Notas |
|-------|--------|-----|-------|
| `roles` | Identity | `BIGSERIAL` | Catálogo: admin, user |
| `users` | Identity | `UUID` (pgcrypto) | CITEXT email, FK a roles |
| `logs` | Identity | `BIGSERIAL` | Append-only, JSONB details |
| `posts` | Market Intelligence | `BIGSERIAL` | Sentimiento, bugs, NPS, churn, JSONB metadata |
| `metric_history` | Metrics | `BIGSERIAL` | KPIs con JSONB dimensions |
| `chat_history` | Assistant | `UUID` | Agrupado por thread_id, JSONB citations |
| `alerts` | Alerts | `BIGSERIAL` | FK a users + posts, severidad |

### Migraciones

- `001_initial_schema.py`: Crea las 7 tablas, extensiones e índices.
- `002_seed_initial_data.py`: Roles base (admin, user) + primer usuario admin.

---

## 6. Endpoints objetivo por módulo

### Identity (✅ Implementado)

```text
POST /api/v1/identity/auth/login
POST /api/v1/identity/auth/refresh
GET  /api/v1/identity/auth/me
GET  /api/v1/identity/users
POST /api/v1/identity/users
GET  /api/v1/identity/users/{id}
PATCH /api/v1/identity/users/{id}
POST /api/v1/identity/users/{id}/activate
POST /api/v1/identity/users/{id}/deactivate
GET  /api/v1/identity/roles
```

### Metrics y Dashboard (🔲 Pendiente)

```text
GET /api/v1/dashboard
GET /api/v1/metrics
GET /api/v1/metrics/{metric_key}
GET /api/v1/metrics/{metric_key}/history
```

### Market Intelligence (🔲 Pendiente)

```text
POST /api/v1/intelligence/sources
POST /api/v1/intelligence/documents
POST /api/v1/intelligence/insights
GET  /api/v1/intelligence/insights
GET  /api/v1/intelligence/insights/{id}
```

### Opportunities (🔲 Pendiente)

```text
GET  /api/v1/opportunities
GET  /api/v1/opportunities/{id}
POST /api/v1/opportunities
POST /api/v1/opportunities/{id}/service-draft
```

### Simulation (🔲 Pendiente)

```text
POST /api/v1/simulation
GET  /api/v1/simulation
GET  /api/v1/simulation/{id}
```

### Assistant (🔲 Pendiente)

```text
POST /api/v1/assistant/threads
GET  /api/v1/assistant/threads/{id}
POST /api/v1/assistant/threads/{id}/messages
GET  /api/v1/assistant/threads/{id}/messages
```

### Alerts (🔲 Pendiente)

```text
GET   /api/v1/alerts
PATCH /api/v1/alerts/{id}/read
WS    /api/v1/alerts/ws  (opcional)
```

---

## 7. Integración con otros equipos

### AI Search → Backend

AI Search necesita:
- Guardar documentos procesados.
- Guardar insights en JSON.
- Consultar fuentes y citas.

Backend entrega:
- Tablas para posts y métricas.
- Endpoints de escritura y lectura.
- Validación de payloads.

### AI Chat → Backend

AI Chat necesita:
- Leer historial de conversaciones.
- Guardar nuevos mensajes.
- Consultar métricas e insights.

Backend entrega:
- Tabla `chat_history` con thread_id para agrupar conversaciones.
- Endpoints de métricas e insights.

---

## 8. Cómo agregar funcionalidad

### Agregar un endpoint en un módulo existente

1. Definir schemas en `app/modules/<modulo>/schemas.py`.
2. Escribir queries en `crud.py`.
3. Implementar lógica en `service.py`.
4. Exponer endpoints en `router.py`.
5. **No tocar `main.py`** — los routers ya están registrados.

### Agregar una tabla nueva

1. Crear el modelo ORM en el `models.py` del módulo correspondiente.
2. Importar el modelo en `app/db/base.py`.
3. Generar migración:
   ```bash
   alembic revision --autogenerate -m "add tabla_x"
   alembic upgrade head
   ```

### Agregar un módulo nuevo

1. Crear carpeta `app/modules/<nombre>/` con `__init__.py`, `router.py`, `schemas.py`, `models.py`, `crud.py`, `service.py`.
2. En `__init__.py`, exportar el router.
3. Registrar el router en `main.py` bajo `api_v1`.
4. Si hay modelos, importarlos en `app/db/base.py`.

---

## 9. Principio rector

Backend debe construir la columna vertebral del sistema:

```text
datos + persistencia + endpoints + seguridad + contratos + modularidad
```

La inteligencia avanzada pertenece principalmente a AI Search y AI Chat. Backend debe habilitar esa inteligencia con una base estable, clara y mantenible.
