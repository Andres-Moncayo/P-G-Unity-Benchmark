# Manual de Implementación de Endpoints — Ejemplo Completo

Guía paso a paso para implementar un endpoint completo desde PostgreSQL hasta React.  
Usa como ejemplo el módulo **Metrics** (`GET /api/v1/metrics`), que ya está implementado en el código real. Cada archivo referenciado en el código tiene comentarios `# ── EJEMPLO ──` para identificarlo.

---

## Visión general del flujo

```text
FRONTEND (React + Vite)                         BACKEND (FastAPI + PostgreSQL)
═══════════════════════                         ═════════════════════════════

src/features/dashboard/                         app/modules/metrics/
  types/metrics.ts       ← Zod schemas   ↔      schemas.py     → Pydantic DTOs
  services/metricsService.ts ← API calls ──→     router.py      → Endpoints HTTP
  hooks/useMetrics.ts     ← TanStack Query       service.py     → Lógica de negocio
  components/MetricsList.tsx ← Renderizado        crud.py        → Queries SQLAlchemy
                                                  models.py      → ORM ↔ PostgreSQL
```

**Regla de oro**: el Zod schema del front y el Pydantic schema del back definen el mismo contrato JSON. Si uno cambia, el otro también.

---

## 🔵 BACKEND

### Paso 1 — Backend: Modelo ORM

📄 **Archivo**: `app/modules/metrics/models.py`

Define la tabla en PostgreSQL usando SQLAlchemy 2.0 con `Mapped[...]`.

**Qué hace este archivo:**
- Define la clase `MetricHistory` que mapea a la tabla `metric_history`
- Usa `Mapped[...]` para tipado estricto de cada columna
- Declara índices (compuesto por `metric_key + recorded_at`, GIN para JSONB)
- Es append-only: solo tiene `created_at`, no `updated_at`

**Después de crear/modificar el modelo:**
1. Importarlo en `app/db/base.py` para que Alembic lo detecte
2. Generar migración: `alembic revision --autogenerate -m "descripción"`
3. Aplicar: `alembic upgrade head`

```python
# ── EJEMPLO (Paso 1 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import BigInteger, DateTime, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class MetricHistory(Base):
    """Historial de métricas. Append-only (sin updated_at)."""

    __tablename__ = "metric_history"
    __table_args__ = (
        Index("ix_metric_history_key_recorded", "metric_key", "recorded_at"),
        Index("ix_metric_history_dimensions_gin", "dimensions", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    dimensions: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    source: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )

# ── FIN EJEMPLO Paso 1 ──
```

---

### Paso 2 — Backend: Schemas Pydantic (DTOs)

📄 **Archivo**: `app/modules/metrics/schemas.py`

Define los contratos de entrada y salida. Esto es lo que el frontend recibe y envía.

**Qué hace este archivo:**
- `MetricHistoryResponse` → Lo que devuelve el GET (una métrica). Incluye `model_config = ConfigDict(from_attributes=True)` para crear desde ORM
- `MetricListResponse` → Respuesta paginada con `items`, `total`, `skip`, `limit`
- `MetricCreate` → Lo que envía el frontend en el POST. Usa `Field(...)` para validaciones

**Regla clave:** Estos schemas definen el contrato JSON. Los Zod schemas del frontend deben matchear exactamente.

```python
# ── EJEMPLO (Paso 2 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── EJEMPLO Responses (GET) ──────────────────────────────────────────────────
class MetricHistoryResponse(BaseModel):
    """Una entrada del historial de métricas."""

    id: int
    metric_key: str
    metric_name: str
    value: float
    unit: Optional[str] = None
    dimensions: dict[str, Any] = {}
    source: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MetricListResponse(BaseModel):
    """Respuesta paginada de métricas."""

    items: list[MetricHistoryResponse]
    total: int
    skip: int
    limit: int


# ── EJEMPLO Requests (POST) ──────────────────────────────────────────────────
class MetricCreate(BaseModel):
    """Payload para registrar una nueva métrica."""

    metric_key: str = Field(..., min_length=1, max_length=100)
    metric_name: str = Field(..., min_length=1, max_length=255)
    value: float
    unit: Optional[str] = Field(default=None, max_length=30)
    dimensions: dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = Field(default=None, max_length=120)

# ── FIN EJEMPLO Paso 2 ──
```

---

### Paso 3 — Backend: CRUD (acceso a datos)

📄 **Archivo**: `app/modules/metrics/crud.py`

Solo queries a la BD. Sin lógica de negocio, sin HTTPException, sin conocimiento de HTTP.

**Qué hace este archivo:**
- `list_metrics()` → SELECT paginado con filtro opcional por `metric_key`. Retorna `(items, total)` para paginación
- `get_metric_by_id()` → SELECT por ID
- `create_metric()` → INSERT + commit + refresh

**Patrones importantes:**
- Paginación: `offset(skip).limit(limit)` + `count()` separado
- Filtro condicional: `if metric_key: stmt = stmt.where(...)`
- Retorna modelos ORM, nunca dicts

```python
# ── EJEMPLO (Paso 3 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.metrics.models import MetricHistory


def list_metrics(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    metric_key: str | None = None,
) -> tuple[list[MetricHistory], int]:
    """Listar métricas con paginación y filtro opcional por key."""
    stmt = select(MetricHistory)

    if metric_key:
        stmt = stmt.where(MetricHistory.metric_key == metric_key)

    # Total count para paginación
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Items paginados
    stmt = stmt.order_by(MetricHistory.recorded_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(stmt).scalars())

    return items, total


def get_metric_by_id(db: Session, metric_id: int) -> MetricHistory | None:
    """Obtener una métrica por su ID."""
    return db.get(MetricHistory, metric_id)


def create_metric(
    db: Session,
    *,
    metric_key: str,
    metric_name: str,
    value: Decimal,
    unit: str | None,
    dimensions: dict,
    source: str | None,
) -> MetricHistory:
    """Insertar una nueva entrada en el historial de métricas."""
    metric = MetricHistory(
        metric_key=metric_key,
        metric_name=metric_name,
        value=value,
        unit=unit,
        dimensions=dimensions,
        source=source,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

# ── FIN EJEMPLO Paso 3 ──
```

---

### Paso 4 — Backend: Service (lógica de negocio)

📄 **Archivo**: `app/modules/metrics/service.py`

Orquesta el CRUD y aplica reglas de negocio. Los routers SOLO llaman funciones de aquí.

**Qué hace este archivo:**
- `get_metrics()` → Delega a `crud.list_metrics()` (en este caso es directo porque no hay lógica extra)
- `get_metric_detail()` → Delega a `crud.get_metric_by_id()`
- `register_metric()` → Convierte `value` de `float` a `Decimal` antes de persistir, luego delega a `crud.create_metric()`

**Cuándo agregar lógica aquí:** Validaciones de negocio, transformaciones de datos, coordinación entre múltiples CRUDs, envío de notificaciones, etc.

```python
# ── EJEMPLO (Paso 4 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.metrics import crud
from app.modules.metrics.models import MetricHistory
from app.modules.metrics.schemas import MetricCreate


def get_metrics(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    metric_key: str | None = None,
) -> tuple[list[MetricHistory], int]:
    """Obtener métricas paginadas con filtro opcional."""
    return crud.list_metrics(db, skip=skip, limit=limit, metric_key=metric_key)


def get_metric_detail(db: Session, metric_id: int) -> MetricHistory | None:
    """Obtener una métrica por ID."""
    return crud.get_metric_by_id(db, metric_id)


def register_metric(db: Session, payload: MetricCreate) -> MetricHistory:
    """Registrar una nueva entrada de métrica."""
    return crud.create_metric(
        db,
        metric_key=payload.metric_key,
        metric_name=payload.metric_name,
        value=Decimal(str(payload.value)),
        unit=payload.unit,
        dimensions=payload.dimensions,
        source=payload.source,
    )

# ── FIN EJEMPLO Paso 4 ──
```

---

### Paso 5 — Backend: Router (endpoints HTTP)

📄 **Archivo**: `app/modules/metrics/router.py`

Expone los endpoints HTTP. Maneja auth, query params y delega al service.

**Qué hace este archivo:**
- `GET /api/v1/metrics` → Lista métricas paginadas. Acepta `skip`, `limit`, `metric_key` como query params
- `GET /api/v1/metrics/{id}` → Detalle de una métrica. Retorna 404 si no existe
- `POST /api/v1/metrics` → Crea una métrica. Retorna 201

**Patrones importantes:**
- `response_model=` en cada endpoint fija el contrato público
- `Depends(get_current_active_user)` protege todos los endpoints con JWT
- `Query(0, ge=0)` valida query params con restricciones
- El router NUNCA llama al CRUD directamente, siempre pasa por service

```python
# ── EJEMPLO (Paso 5 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.modules.identity.models import User
from app.modules.metrics import service
from app.modules.metrics.schemas import (
    MetricCreate,
    MetricHistoryResponse,
    MetricListResponse,
)
from core.database import get_db
from core.security import get_current_active_user

router = APIRouter(prefix="/metrics", tags=["Metrics"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── GET /api/v1/metrics ─────────────────────────────────────────────
@router.get("", response_model=MetricListResponse)
def list_metrics(
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0, description="Registros a saltar"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de registros"),
    metric_key: str | None = Query(None, description="Filtrar por clave de métrica"),
):
    """Listar historial de métricas con paginación."""
    items, total = service.get_metrics(
        db, skip=skip, limit=limit, metric_key=metric_key
    )
    return MetricListResponse(items=items, total=total, skip=skip, limit=limit)


# ── GET /api/v1/metrics/{id} ────────────────────────────────────────
@router.get("/{metric_id}", response_model=MetricHistoryResponse)
def get_metric(
    metric_id: int,
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Obtener detalle de una métrica por ID."""
    metric = service.get_metric_detail(db, metric_id)
    if metric is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Métrica no encontrada",
        )
    return metric


# ── POST /api/v1/metrics ────────────────────────────────────────────
@router.post(
    "",
    response_model=MetricHistoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_metric(
    payload: MetricCreate,
    _: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Registrar una nueva entrada de métrica."""
    return service.register_metric(db, payload)

# ── FIN EJEMPLO Paso 5 ──
```

---

### Paso 6 — Verificar en `/docs`

Levantar el backend y abrir `http://localhost:8000/docs`. Verificar que los 3 endpoints aparecen bajo "Metrics" y probarlos con "Try it out".

```bash
uvicorn main:app --reload --port 8000
```

---

## 🟢 FRONTEND

### Paso 7 — Frontend: Zod schemas (tipos)

📄 **Archivo**: `src/features/dashboard/types/metrics.ts`

Los Zod schemas deben matchear **exactamente** con los Pydantic schemas del backend (Paso 2).

**Qué hace este archivo:**
- `MetricHistorySchema` → Matchea con `MetricHistoryResponse` del backend. Nota: `datetime` de Python llega como `string` ISO al frontend
- `MetricListSchema` → Matchea con `MetricListResponse` (respuesta paginada)
- `MetricCreateSchema` → Matchea con `MetricCreate` (payload del POST)
- Cada schema exporta su tipo inferido con `z.infer<typeof Schema>`

**Nota sobre nullable:** Los campos `Optional[str]` de Pydantic se mapean a `z.string().nullable()` en Zod, no a `z.string().optional()`.

```typescript
// ── EJEMPLO (Paso 7 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
import { z } from 'zod';

// Matchea con → MetricHistoryResponse (backend schemas.py)
export const MetricHistorySchema = z.object({
  id: z.number(),
  metric_key: z.string(),
  metric_name: z.string(),
  value: z.number(),
  unit: z.string().nullable(),
  dimensions: z.record(z.string(), z.unknown()).default({}),
  source: z.string().nullable(),
  recorded_at: z.string(), // ISO datetime string
  created_at: z.string(),
});
export type MetricHistory = z.infer<typeof MetricHistorySchema>;

// Matchea con → MetricListResponse (backend schemas.py)
export const MetricListSchema = z.object({
  items: z.array(MetricHistorySchema),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});
export type MetricList = z.infer<typeof MetricListSchema>;

// Matchea con → MetricCreate (backend schemas.py)
export const MetricCreateSchema = z.object({
  metric_key: z.string().min(1).max(100),
  metric_name: z.string().min(1).max(255),
  value: z.number(),
  unit: z.string().max(30).nullable().default(null),
  dimensions: z.record(z.string(), z.unknown()).default({}),
  source: z.string().max(120).nullable().default(null),
});
export type MetricCreate = z.infer<typeof MetricCreateSchema>;

// ── FIN EJEMPLO Paso 7 ──
```

---

### Paso 8 — Frontend: Mock data

📄 **Archivo**: `src/features/dashboard/services/mockMetricsData.ts`

Datos de ejemplo para desarrollo sin backend. Deben cumplir con el mismo Zod schema.

**Qué hace este archivo:**
- Exporta `metricsMockData` con forma `MetricList` (items + paginación)
- Los datos deben ser realistas para que la UI se vea bien durante desarrollo

```typescript
// ── EJEMPLO (Paso 8 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
import type { MetricList } from '../types/metrics';

export const metricsMockData: MetricList = {
  items: [
    {
      id: 1,
      metric_key: 'revenue_growth',
      metric_name: 'Revenue Growth YoY',
      value: 12.5,
      unit: '%',
      dimensions: { region: 'LATAM', segment: 'enterprise' },
      source: 'finance_api',
      recorded_at: '2026-05-01T10:00:00Z',
      created_at: '2026-05-01T10:00:00Z',
    },
    {
      id: 2,
      metric_key: 'churn_rate',
      metric_name: 'Monthly Churn Rate',
      value: 3.2,
      unit: '%',
      dimensions: { segment: 'smb' },
      source: 'crm_export',
      recorded_at: '2026-05-01T10:00:00Z',
      created_at: '2026-05-01T10:00:00Z',
    },
  ],
  total: 2,
  skip: 0,
  limit: 50,
};

// ── FIN EJEMPLO Paso 8 ──
```

---

### Paso 9 — Frontend: Service (llamadas API)

📄 **Archivo**: `src/features/dashboard/services/metricsService.ts`

Funciones que llaman al backend y validan la respuesta con Zod.

**Qué hace este archivo:**
- `getMetrics()` → GET al backend. Arma query params, llama `apiClient<unknown>()`, valida con `MetricListSchema.parse(data)`. Si falla, usa mock data como fallback
- `createMetric()` → POST al backend. Envía payload, valida respuesta con `MetricHistorySchema.parse(data)`

**Patrón de fallback (try/catch):**
1. Intenta llamar al backend real
2. Si falla (backend no levantado, error de red, etc.), simula latencia y retorna mock data
3. En ambos casos, el dato pasa por `Zod.parse()` para garantizar la forma

```typescript
// ── EJEMPLO (Paso 9 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
import { apiClient } from '../../../services/apiClient';
import { MetricListSchema, MetricHistorySchema } from '../types/metrics';
import type { MetricCreate } from '../types/metrics';
import { metricsMockData } from './mockMetricsData';

// GET /api/v1/metrics
export const getMetrics = async (params?: {
  skip?: number;
  limit?: number;
  metric_key?: string;
}) => {
  try {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.metric_key) query.set('metric_key', params.metric_key);

    const data = await apiClient<unknown>(`/metrics?${query}`);
    return MetricListSchema.parse(data);
  } catch (error) {
    console.warn('API no disponible, usando mock data:', error);
    await new Promise((r) => setTimeout(r, 500));
    return MetricListSchema.parse(metricsMockData);
  }
};

// POST /api/v1/metrics
export const createMetric = async (payload: MetricCreate) => {
  const data = await apiClient<unknown>('/metrics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return MetricHistorySchema.parse(data);
};

// ── FIN EJEMPLO Paso 9 ──
```

---

### Paso 10 — Frontend: Hook de TanStack Query

📄 **Archivo**: `src/features/dashboard/hooks/useMetrics.ts`

Hooks que envuelven las funciones del service.

**Qué hace este archivo:**
- `useMetrics()` → `useQuery` para el GET. La `queryKey` incluye los params para que se invalide si cambian
- `useCreateMetric()` → `useMutation` para el POST. En `onSuccess` invalida la cache de `['metrics']` para refrescar la lista

```typescript
// ── EJEMPLO (Paso 10 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMetrics, createMetric } from '../services/metricsService';
import type { MetricCreate } from '../types/metrics';

// Hook para leer métricas (GET)
export function useMetrics(params?: {
  skip?: number;
  limit?: number;
  metric_key?: string;
}) {
  return useQuery({
    queryKey: ['metrics', params],
    queryFn: () => getMetrics(params),
  });
}

// Hook para crear métrica (POST)
export function useCreateMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MetricCreate) => createMetric(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

// ── FIN EJEMPLO Paso 10 ──
```

---

### Paso 11 — Frontend: Componente

📄 **Archivo**: `src/features/dashboard/components/MetricsList.tsx`

Componente que consume el hook y renderiza.

**Qué hace este archivo:**
- Llama a `useMetrics({ limit: 20 })` para obtener los datos
- Maneja los 3 estados obligatorios: `isLoading`, `isError`, y `data`
- Renderiza la lista de métricas con nombre y valor

```tsx
// ── EJEMPLO (Paso 11 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
import { useMetrics } from '../hooks/useMetrics';

export function MetricsList() {
  const { data, isLoading, isError, error } = useMetrics({ limit: 20 });

  if (isLoading) {
    return <div className="text-gray-400 p-4">Cargando métricas...</div>;
  }

  if (isError) {
    return <div className="text-red p-4">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-white">
        Métricas ({data?.total})
      </h2>
      <ul className="space-y-1">
        {data?.items.map((metric) => (
          <li
            key={metric.id}
            className="bg-surface rounded-lg p-3 flex justify-between"
          >
            <span className="text-gray-300">{metric.metric_name}</span>
            <span className="text-blue-light font-mono">
              {metric.value}
              {metric.unit ? ` ${metric.unit}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── FIN EJEMPLO Paso 11 ──
```

---

### Paso 12 — Frontend: Barrel export

📄 **Archivo**: `src/features/dashboard/index.ts`

Exporta solo lo que otros módulos necesitan consumir.

```typescript
// ── EJEMPLO (Paso 12 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
export { default as Dashboard } from './components/Dashboard';
export { MetricsList } from './components/MetricsList';
export { useMetrics } from './hooks/useMetrics';
// ── FIN EJEMPLO Paso 12 ──
```

---

## Resumen del flujo

```text
                    CONTRATO JSON (el mismo)
                    ┌────────────────────────┐
                    │  {                     │
                    │    items: [...],       │
                    │    total: number,      │
                    │    skip: number,       │
                    │    limit: number       │
                    │  }                     │
                    └──────┬────────┬────────┘
                           │        │
              Pydantic     │        │     Zod
          MetricListResponse        MetricListSchema
                           │        │
   BACKEND                 │        │              FRONTEND
   ════════                │        │              ════════
   models.py  (Paso 1)     │        │     types/metrics.ts  (Paso 7)
        ↓                  │        │              ↓
   schemas.py (Paso 2)     │        │     mockMetricsData.ts (Paso 8)
        ↓                  │        │              ↓
   crud.py    (Paso 3)     │        │     metricsService.ts (Paso 9)
        ↓                  │        │              ↓
   service.py (Paso 4)     │        │     useMetrics.ts     (Paso 10)
        ↓                  │        │              ↓
   router.py  (Paso 5)─────┘        └──── MetricsList.tsx   (Paso 11)
```

## Checklist antes de hacer merge

### Backend ✓

- [ ] `schemas.py` define Request + Response con `model_config = ConfigDict(from_attributes=True)`
- [ ] `crud.py` solo tiene queries (sin HTTPException, sin lógica de negocio)
- [ ] `service.py` orquesta el CRUD (los routers no llaman al crud directamente)
- [ ] `router.py` usa `response_model=` en cada endpoint
- [ ] `router.py` usa `Depends(get_current_active_user)` para auth
- [ ] Si hay modelo nuevo, está importado en `app/db/base.py`
- [ ] Si hay tabla nueva, hay migración Alembic generada y aplicada
- [ ] El endpoint aparece y funciona en `/docs`

### Frontend ✓

- [ ] `types/` tiene Zod schemas que matchean con Pydantic schemas del backend
- [ ] `services/` usa `apiClient<unknown>()` + `Schema.parse(data)`
- [ ] `services/` tiene fallback a mock data (try/catch)
- [ ] `hooks/` usa `useQuery` para GETs y `useMutation` para POSTs
- [ ] `hooks/` invalida cache con `queryClient.invalidateQueries()` en `onSuccess`
- [ ] `index.ts` exporta los componentes y hooks públicos del feature
- [ ] Los componentes manejan los 3 estados: `isLoading`, `isError`, `data`
