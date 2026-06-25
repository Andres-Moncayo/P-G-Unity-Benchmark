# Refactorización de IA Posts y Base PostgreSQL

## Qué se modificó

### 1) Contrato plano para análisis IA
Se reemplazó el esquema anterior de `PostAnalysis` por un modelo plano en [app/modules/ia_posts/schemas.py](app/modules/ia_posts/schemas.py).

Ahora el análisis esperado por Gemini tiene campos de primer nivel para:
- fuente y contexto (`source_platform`, `source_subreddit`, `source_author`)
- engagement (`engagement_upvotes`, `engagement_comments`, `engagement_shares`)
- sentimiento (`sentiment_score`, `sentiment_label`, `sentiment_confidence`)
- análisis técnico (`technical_bug_category`, `technical_severity`, `technical_unity_version`, `technical_affected_platforms`)
- riesgo de negocio y churn (`business_churn_risk`, `business_churn_probability`, `business_revenue_impact`, `business_user_segment`)
- inteligencia competitiva (`competitive_competitor_mentioned`, `competitive_comparison_type`, `competitive_migration_intent`)
- NPS (`nps_sentiment_strength`, `nps_would_recommend`, `nps_key_factors`)
- contexto de mercado y alertas (`market_*`, `alert_*`, `business_category`)

### 2) Prompt y validación del LLM
Se actualizó [app/services/llm.py](app/services/llm.py) para que Gemini produzca exactamente ese contrato plano.

El prompt ahora:
- prohíbe objetos anidados
- obliga a usar claves top-level בלבד
- guía la inferencia de `business_category`, `alert_influence_score`, `nps_key_factors` y `business_churn_risk`
- mantiene la respuesta estructurada en JSON compatible con FastAPI

### 3) Búsqueda concurrente y contexto más rico
Se refactorizó [app/services/search.py](app/services/search.py) para:
- ejecutar variantes de búsqueda en paralelo con `asyncio.gather`
- ampliar las consultas con términos de negocio y pricing
- pedir a Tavily `search_depth="advanced"`
- solicitar `include_raw_content=True` para dar más contexto al LLM

Esto se hizo para aumentar la cobertura de URLs útiles sin penalizar el tiempo de respuesta.

### 4) Modelo SQLAlchemy plano para `analyzed_posts`
Se reescribió [app/modules/ia_posts/models.py](app/modules/ia_posts/models.py) para que cada campo del JSON plano tenga su columna.

Cambios importantes:
- `technical_affected_platforms` y `nps_key_factors` usan `ARRAY(String)` de PostgreSQL
- se eliminó el uso de `JSONB`
- se agregó un `record_id` interno como PK técnica para evitar colisiones
- el campo lógico `id` quedó como string persistido, como exige el contrato IA
- se mantuvieron índices para lectura por fecha, plataforma y urgencia

### 5) Persistencia directa 1:1
Se actualizó [app/modules/ia_posts/crud.py](app/modules/ia_posts/crud.py) para guardar el `PostAnalysis` plano directamente en SQLAlchemy.

La razón es simple: el servicio ya devuelve un objeto plano y no necesitábamos más mapeo intermedio ni estructuras anidadas.

### 6) Rutas FastAPI
Se ajustó [app/modules/ia_posts/router.py](app/modules/ia_posts/router.py) para que:
- `GET /api/v1/ia-posts/posts` responda con `PostAnalysis`
- `POST /api/v1/ia-posts/addpostUnity`
- `POST /api/v1/ia-posts/addpostUnrealEngine`
- `POST /api/v1/ia-posts/addpostGodot`

sigan funcionando con el nuevo contrato y persistan en PostgreSQL.

### 7) Compatibilidad con módulos consumidores
Se ajustó [app/modules/competitors/schemas.py](app/modules/competitors/schemas.py) para que los DTOs que leen `analyzed_posts` acepten `id` como string, porque el contrato IA ahora usa identificadores de texto.

También se normalizó la conexión en [core/database.py](core/database.py) para aceptar URLs antiguas `postgres://` y convertirlas a un dialecto válido para SQLAlchemy 2 (`postgresql+psycopg://`).

## Por qué se hizo

El objetivo era migrar el backend a un formato flat/wide table para que Gemini extraiga métricas de negocio, producto, NPS y alertas sin estructuras anidadas.

Eso mejora tres cosas:
- simplifica el schema de IA
- evita problemas de serialización y validación
- hace más fáciles las consultas analíticas posteriores en PostgreSQL

Además, la base en la nube estaba vacía y el proyecto estaba fallando por dos causas técnicas:
- la URL de PostgreSQL venía en formato legacy `postgres://`
- el modelo anterior guardaba datos con campos incompatibles con el contrato nuevo

## Qué se creó en la nube

Se inicializó PostgreSQL con las tablas necesarias para los flujos que se tocaron:
- `chat_conversations`
- `chat_messages`
- `analyzed_posts`
- `market_positioning`
- `strategic_initiatives`

## Validación realizada

Se probaron estas rutas contra una instancia real de la API:
- `GET /health`
- `GET /api/v1/ia-posts/posts`
- `GET /api/v1/competitors/dashboard`
- `POST /api/v1/ia-posts/addpostUnity`

Resultado:
- los `GET` responden correctamente
- `addpostUnity` terminó persistiendo 10 posts en la base remota

## Observaciones

- El backend quedó alineado con el contrato plano de IA.
- El análisis sigue dependiendo de Gemini y Tavily para generar resultados reales.
- Si en el futuro se quiere dar persistencia analítica a más campos o evitar duplicados lógicos por `id`, conviene agregar una política adicional de deduplicación o versionado.
