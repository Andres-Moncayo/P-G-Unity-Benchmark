# Cambios Realizados en Monitorization

Fecha: 2026-05-12

## 1. Implementacion del modulo de monitorizacion

Se creo e implemento el router de monitorizacion con endpoints para:

- Listado de posts con filtros y paginacion.
- Consulta de post por ID.
- Listado de posts por sentimiento.
- Metricas agregadas para dashboard.

Archivo impactado:

- `app/modules/monitorization/router.py`

## 2. Endpoints implementados

Base path del router: `/monitorization`

- `GET /monitorization/posts`
  - Filtros: `sentiment`, `platform`, `bug`
  - Paginacion: `skip`, `limit`
- `GET /monitorization/posts/{post_id}`
- `GET /monitorization/posts/sentiment/{sentiment}`
- `GET /monitorization/monitored_forums`
- `GET /monitorization/monitored_bugs`
- `GET /monitorization/count_posts`
  - Query params: `start_date`, `end_date`
- `GET /monitorization/non_official_posts_count`

## 3. Refactor: migracion de funciones a CRUD

Se movio la logica de acceso a datos desde el router hacia el archivo CRUD para respetar la arquitectura por capas.

Archivo creado:

- `app/modules/monitorization/crud.py`

Funciones agregadas en CRUD:

- `list_monitorization_posts(...)`
- `get_monitorization_post_by_id(...)`
- `list_posts_by_sentiment(...)`
- `get_monitored_forums(...)`
- `get_monitored_bugs(...)`
- `count_monitored_posts(...)`
- `count_non_official_monitored_posts(...)`

El router ahora consume esas funciones y mantiene la capa HTTP enfocada en:

- Validacion de request.
- Mapeo de respuestas.
- Manejo de errores HTTP.

## 4. Ajustes tecnicos realizados

- Se corrigio el orden de rutas para evitar colision entre:
  - `/posts/sentiment/{sentiment}`
  - `/posts/{post_id}`
- Se corrigio la firma de `api_count_posts` para evitar error de sintaxis de Python por orden de parametros.
- Se agregaron `summary` y `description` en ingles para todos los endpoints de monitorizacion, para mejorar la documentacion en Swagger.
- Se actualizo `monitored_forums` para devolver `CountResponse` (`{ count }`) en lugar de lista.
- La metrica de `monitored_forums` ahora se calcula desde sitios configurados en `SearchService` (dominios monitoreados de busqueda), no desde posts almacenados.

## 5. Validacion ejecutada

Validaciones realizadas durante la implementacion:

- Import smoke test de `router.py` y `crud.py` exitoso.
- Verificacion de errores de analisis (sin errores en ambos archivos).
- Prueba de humo de endpoints y funciones con `FastAPI TestClient` y sesion fake:
  - Todos los endpoints respondieron `200` en el escenario de prueba.
- Verificacion de carga de aplicacion (`import main`) exitosa tras registrar el router de monitorizacion.

## 6. Integracion en API y Swagger

Estos cambios ya fueron aplicados para que los endpoints se vean en `/docs`:

- Registro del router en `main.py` dentro de `api_v1.include_router(...)`.
- Creacion de `app/modules/monitorization/__init__.py` para exponer `router`.
- Endpoints visibles bajo prefijo versionado: `/api/v1/monitorization`.

## 7. Consumo desde Frontend (React + TypeScript)

Asumiendo que el backend publica bajo `/api/v1`, la base para monitorizacion seria:

- `/api/v1/monitorization`

### 7.1 Tipos sugeridos (TypeScript)

```ts
export type MonitorizationPost = {
  id: number;
  title: string;
  summary: string | null;

## 8. Fixes y compatibilidad con esquemas legacy

- Se añadió un fallback robusto en `app/modules/monitorization/crud.py` que:
  - Intenta usar el modelo ORM `Post` (tabla `posts`).
  - Si la tabla no existe, consulta `analyzed_posts` detectando dinámicamente columnas disponibles.
  - Normaliza las filas retornadas hacia la forma esperada por el `MonitorizationPostResponse` (se añadió `_normalize_row`).
  - Convierte `churn_risk` a boolean y mapea nombres alternativos de columnas (`promotor` → `promoter`, `date_post` → `date`, etc.).
- Se corrigió la comparación de fechas en `count_monitored_posts` para evitar errores de tipos en Postgres al comparar `varchar` con `timestamp`: cuando la columna es `date_post` se hace un cast a `timestamp` en la consulta.
- Resultado: los endpoints son resilientes frente a dos variantes del esquema (`posts` vs `analyzed_posts`) y pasaron las pruebas de humo locales.

## 9. Scripts de prueba

- `scripts/monitorization_smoke_test.py`: script que ejecuta un conjunto de peticiones con `TestClient` para validar los endpoints básicos.

Si quieres, puedo crear ejemplos adicionales para el frontend (consumo con React Query, SWR, o ejemplos de componentes más completos). 
  url: string | null;
  date: string;
  platform: string;
  sentiment: string;
  bug: string | null;
  performance: string | null;
  churn_risk: boolean;
  churn_percentage: number | null;
  promoter: number;
  detractor: number;
  alert_type: string;
  created_at: string;
};

export type CountResponse = {
  count: number;
};
```

### 7.2 Servicio API (axios)

```ts
import api from "@/services/api";

import type { CountResponse, MonitorizationPost } from "./types";

const BASE = "/monitorization";

export async function getMonitorizationPosts(params?: {
  sentiment?: string;
  platform?: string;
  bug?: string;
  skip?: number;
  limit?: number;
}) {
  const { data } = await api.get<MonitorizationPost[]>(`${BASE}/posts`, { params });
  return data;
}

export async function getMonitorizationPostById(postId: number) {
  const { data } = await api.get<MonitorizationPost>(`${BASE}/posts/${postId}`);
  return data;
}

export async function getPostsBySentiment(sentiment: string, limit = 50) {
  const { data } = await api.get<MonitorizationPost[]>(`${BASE}/posts/sentiment/${sentiment}`, {
    params: { limit },
  });
  return data;
}

export async function getMonitoredForumsCount() {
  const { data } = await api.get<CountResponse>(`${BASE}/monitored_forums`);
  return data.count;
}

export async function getMonitoredBugsCount() {
  const { data } = await api.get<CountResponse>(`${BASE}/monitored_bugs`);
  return data.count;
}

export async function getMonitoredPostsCount(startDate: string, endDate: string) {
  const { data } = await api.get<CountResponse>(`${BASE}/count_posts`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return data.count;
}

export async function getNonOfficialMonitoredPostsCount() {
  const { data } = await api.get<CountResponse>(`${BASE}/non_official_posts_count`);
  return data.count;
}
```

### 7.3 Hook de ejemplo

```ts
import { useEffect, useState } from "react";

import {
  getMonitorizationPosts,
  getMonitoredBugsCount,
  getMonitoredForumsCount,
  getNonOfficialMonitoredPostsCount,
} from "./monitorizationApi";
import type { MonitorizationPost } from "./types";

export function useMonitorizationDashboard() {
  const [posts, setPosts] = useState<MonitorizationPost[]>([]);
  const [forumsCount, setForumsCount] = useState(0);
  const [bugsCount, setBugsCount] = useState(0);
  const [nonOfficialCount, setNonOfficialCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [postsData, forums, bugs, nonOfficial] = await Promise.all([
          getMonitorizationPosts({ limit: 20 }),
          getMonitoredForumsCount(),
          getMonitoredBugsCount(),
          getNonOfficialMonitoredPostsCount(),
        ]);

        setPosts(postsData);
        setForumsCount(forums);
        setBugsCount(bugs);
        setNonOfficialCount(nonOfficial);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando monitorizacion");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return {
    posts,
    forumsCount,
    bugsCount,
    nonOfficialCount,
    loading,
    error,
  };
}
```

### 7.4 Ejemplo de uso en componente

```tsx
import { useMonitorizationDashboard } from "./useMonitorizationDashboard";

export function MonitorizationWidget() {
  const { posts, forumsCount, bugsCount, nonOfficialCount, loading, error } =
    useMonitorizationDashboard();

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <section>
      <h2>Monitorizacion</h2>
      <p>Webs monitoreadas: {forumsCount}</p>
      <p>Bugs monitoreados: {bugsCount}</p>
      <p>Posts no oficiales: {nonOfficialCount}</p>
      <p>Ultimos posts: {posts.length}</p>
    </section>
  );
}
```

Nota: el endpoint `monitored_forums` ahora devuelve un numero (`{ count }`) y no una lista, porque representa la cantidad de webs configuradas en el servicio de busqueda.
