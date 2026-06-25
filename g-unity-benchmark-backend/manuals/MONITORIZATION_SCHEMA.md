# Monitorización - Estructura JSON Anidada Compleja

## Problema Original (05/13/2026)

El JSON que devolvía el backend era **plano y simplificado**:
```json
{
  "id": 1,
  "title": "string",
  "platform": "unity",
  "sentiment": "positive",
  "bug": "crash",
  "churn_risk": false,
  ...
}
```

Pero se **esperaba una estructura compleja con 8 nested objects**:
```json
{
  "id": "1",
  "title": "string",
  "source": { "platform": "...", "subreddit": "...", "author": "...", "engagement": {...} },
  "sentiment": { "score": 0.7, "label": "positive", "confidence": 0.8 },
  "technical_analysis": { "bug_category": "...", "severity": "...", ... },
  "business_metrics": { "churn_risk": "...", "churn_probability": 0.5, ... },
  "competitive_intelligence": { ... },
  "nps_indicators": { ... },
  "market_signals": { ... },
  "alert_metadata": { ... },
  ...
}
```

**Decisión**: Devolver la estructura compleja (aunque con muchos campos vacíos inicialmente). Los otros equipos completarán esos datos desde el LLM después.

---

## Qué Se Hizo

### 1. Backend - Crear Schemas Pydantic

**Archivo**: `app/modules/monitorization/schemas.py` (NUEVO)

Define 8 nested models:

```python
class SourceObject(BaseModel):
    platform: str
    subreddit: Optional[str] = None
    author: Optional[str] = None
    engagement: dict  # { "upvotes": int, "comments": int, "shares": int }

class SentimentObject(BaseModel):
    score: float  # -1 to 1
    label: str    # positive/negative/neutral
    confidence: float  # 0-1

class TechnicalAnalysis(BaseModel):
    bug_category: Optional[str] = None
    severity: Optional[str] = None  # low/medium/high/critical
    unity_version: Optional[str] = None
    affected_platforms: List[str] = []

class BusinessMetrics(BaseModel):
    churn_risk: Optional[str] = None  # low/medium/high
    churn_probability: Optional[float] = None  # 0-1
    revenue_impact: Optional[str] = None
    user_segment: Optional[str] = None

class CompetitiveIntelligence(BaseModel):
    competitor_mentioned: Optional[str] = None
    comparison_type: Optional[str] = None
    migration_intent: Optional[str] = None

class NPSIndicators(BaseModel):
    sentiment_strength: Optional[float] = None  # -2 to 2
    would_recommend: Optional[bool] = None
    key_factors: List[str] = []

class MarketSignals(BaseModel):
    industry_trend: Optional[str] = None
    adoption_stage: Optional[str] = None
    company_size: Optional[str] = None
    geographic_region: Optional[str] = None

class AlertMetadata(BaseModel):
    type: Optional[str] = None  # technical/financial/competitive/community
    urgency: Optional[str] = None
    reach: Optional[int] = None
    influence_score: Optional[float] = None

class MonitorizationPostDetailResponse(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    date: datetime
    source: SourceObject
    sentiment: SentimentObject
    platform_mentioned: str
    technical_analysis: TechnicalAnalysis
    business_metrics: BusinessMetrics
    competitive_intelligence: CompetitiveIntelligence
    nps_indicators: NPSIndicators
    market_signals: MarketSignals
    alert_metadata: AlertMetadata
    business_category: Optional[str] = None
```

### 2. Backend - Transformar Datos Planos a Estructura Anidada

**Archivo**: `app/modules/monitorization/crud.py`

Agregó función `_transform_to_detailed_response()`:

```python
def _transform_to_detailed_response(flat_post: dict[str, Any]) -> MonitorizationPostDetailResponse:
    """Transforma post plano → estructura anidada con nested objects"""
    
    # 1. Mapear sentimiento simple a estructura compleja
    sentiment_label = flat_post.get("sentiment", "").lower()
    if "pos" in sentiment_label:
        sentiment_score = 0.7
        sentiment_label = "positive"
    elif "neg" in sentiment_label:
        sentiment_score = -0.7
        sentiment_label = "negative"
    else:
        sentiment_score = 0.0
        sentiment_label = "neutral"
    
    # 2. Extraer metadata (datos opcionales de BD)
    metadata = flat_post.get("post_metadata", {}) or {}
    
    # 3. Asegurar valores válidos
    post_date = flat_post.get("date") or datetime.utcnow()
    churn_pct = flat_post.get("churn_percentage")
    churn_prob = (churn_pct / 100) if churn_pct else None
    
    # 4. Crear respuesta con nested objects
    return MonitorizationPostDetailResponse(
        id=str(flat_post.get("id", "")),
        title=flat_post.get("title", ""),
        ...
        source=SourceObject(
            platform=flat_post.get("platform", ""),
            subreddit=metadata.get("subreddit"),
            author=metadata.get("author"),
            engagement=metadata.get("engagement", {"upvotes": 0, "comments": 0, "shares": 0})
        ),
        sentiment=SentimentObject(
            score=sentiment_score,
            label=sentiment_label,
            confidence=0.8
        ),
        technical_analysis=TechnicalAnalysis(
            bug_category=flat_post.get("bug"),
            severity=_map_alert_to_severity(flat_post.get("alert_type", "low")),
            ...
        ),
        business_metrics=BusinessMetrics(
            churn_risk=_map_churn_to_risk_level(flat_post.get("churn_risk", False)),
            churn_probability=churn_prob,
            ...
        ),
        ...
    )
```

También agregó funciones helper:
- `_map_alert_to_severity()`: alert_type → severity level
- `_map_churn_to_risk_level()`: boolean → risk string
- `_map_alert_type()`: alert_type → alert metadata type

### 3. Backend - Actualizar Endpoints

**Archivo**: `app/modules/monitorization/router.py`

Cambió todos los endpoints para:
1. Importar `_transform_to_detailed_response` y nuevos schemas
2. Retornar `MonitorizationPostDetailResponse` en lugar de `MonitorizationPostResponse`
3. Aplicar transformación: `return [_transform_to_detailed_response(p) for p in posts]`

Endpoints actualizados:
- `GET /posts` → Lista con estructura compleja
- `GET /posts/{id}` → Detalle con estructura compleja
- `GET /posts/sentiment/{sentiment}` → Filtrados con estructura compleja
- `GET /posts/categories` → Agrupados con estructura compleja

### 4. Frontend - TypeScript Types

**Archivo**: `src/features/monitorization/types/index.ts` (NUEVO)

Define interfaces TypeScript que mapean la respuesta del backend:

```typescript
export interface Engagement {
  upvotes: number;
  comments: number;
  shares: number;
}

export interface SourceObject {
  platform: string;
  subreddit?: string | null;
  author?: string | null;
  engagement: Engagement;
}

export interface SentimentObject {
  score: number;  // -1 to 1
  label: "positive" | "negative" | "neutral";
  confidence: number;  // 0-1
}

export interface TechnicalAnalysis {
  bug_category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | null;
  unity_version?: string | null;
  affected_platforms: string[];
}

// ... (BusinessMetrics, CompetitiveIntelligence, NPSIndicators, MarketSignals, AlertMetadata)

export interface MonitorizationPost {
  id: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  date: string;  // ISO datetime
  source: SourceObject;
  sentiment: SentimentObject;
  platform_mentioned: string;
  technical_analysis: TechnicalAnalysis;
  business_metrics: BusinessMetrics;
  competitive_intelligence: CompetitiveIntelligence;
  nps_indicators: NPSIndicators;
  market_signals: MarketSignals;
  alert_metadata: AlertMetadata;
  business_category?: string | null;
}

export interface MonitorizationBusinessCategoryGroup {
  category: string;
  posts: MonitorizationPost[];
}
```

### 5. Frontend - Service Layer

**Archivo**: `src/features/monitorization/services/monitorizationService.ts`

Actualizar tipos:
```typescript
import { MonitorizationPost, MonitorizationBusinessCategoryGroup } from '../types';

export async function listPosts(params: ListParams = {}) {
  // ...
  return apiClient<MonitorizationPost[]>(`/monitorization/posts?${qs.toString()}`);
}

export async function listPostsByCategory(limit = 20, sourceLimit = 200) {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('source_limit', String(sourceLimit));
  return apiClient<MonitorizationBusinessCategoryGroup[]>(`/monitorization/posts/categories?${qs.toString()}`);
}
```

### 6. Frontend - Hooks

**Archivo**: `src/features/monitorization/hooks/useMonitorization.ts`

Actualizar:
1. Tipo de estado: `const [allPosts, setAllPosts] = useState<MonitorizationPost[]>([])`
2. Filtro de sentimiento: `post.sentiment.label` en lugar de `post.sentiment`
3. Búsqueda: incluir nested fields relevantes

```typescript
const matchesSentiment = useCallback((post: MonitorizationPost, filter: string | null) => {
  if (!filter) return true;
  const normalizedSentiment = post.sentiment.label.toLowerCase();
  // ...
}, []);

const matchesSearchQuery = useCallback((post: MonitorizationPost, query: string) => {
  // Buscar en: title, summary, platform_mentioned, alert_type, source.platform, etc.
  const searchableText = [
    post.title,
    post.summary,
    post.platform_mentioned,
    post.alert_metadata?.type,
    post.source.platform,
    post.nps_indicators?.key_factors.join(' ') ?? '',
  ].filter(Boolean).join(' ').toLowerCase();
  return searchableText.includes(trimmedQuery);
}, []);
```

### 7. Frontend - Componentes

**Archivo**: `src/features/monitorization/components/LiveMonitoringFeed.tsx`

Actualizar mapping de post a row:
```typescript
import { MonitorizationPost } from '../types';

export function LiveMonitoringFeed({ posts = [], loading = false }: { posts: MonitorizationPost[]; loading: boolean }) {
  const feedItems = posts.map((p: MonitorizationPost) => ({
    source: p.source.platform,           // De nested object
    time: new Date(p.date).toLocaleString('en-US'),
    business: p.business_category || 'General',
    sentiment: p.sentiment.label,        // De nested object
    title: stripVisibleIdPrefix(p.title || p.summary || 'Untitled'),
    tags: p.nps_indicators?.key_factors ?? [],  // De nested array
    relevance: Math.min(100, Math.round(Math.abs((p.business_metrics?.churn_probability ?? 0.5) * 100))),
  }));
  
  // ... resto del componente
}
```

---

## Cómo Extender / Cambiar en el Futuro

### Si necesitas agregar un nuevo nested field:

1. **Backend - schemas.py**:
   - Agregar campo al object correspondiente (ej: `TechnicalAnalysis`)
   ```python
   class TechnicalAnalysis(BaseModel):
       bug_category: Optional[str] = None
       severity: Optional[str] = None
       unity_version: Optional[str] = None
       affected_platforms: List[str] = []
       new_field: Optional[str] = None  # ← NUEVO
   ```

2. **Backend - crud.py**:
   - Mapear en `_transform_to_detailed_response()`:
   ```python
   technical_analysis=TechnicalAnalysis(
       ...
       new_field=metadata.get("new_field"),  # ← NUEVO
   )
   ```

3. **Frontend - types/index.ts**:
   - Agregar a la interface TypeScript:
   ```typescript
   export interface TechnicalAnalysis {
       ...
       new_field?: string | null;  // ← NUEVO
   }
   ```

4. **Frontend - componentes/hooks**:
   - Usar el nuevo field: `post.technical_analysis.new_field`

### Si necesitas cambiar el mapeo de datos:

- **Función**: `_transform_to_detailed_response()` en `crud.py`
- **Helper functions**: `_map_alert_to_severity()`, `_map_churn_to_risk_level()`, etc.
- Ejemplo: Si cambia cómo se calcula `churn_probability`:
  ```python
  # Antes:
  churn_prob = (churn_pct / 100) if churn_pct else None
  
  # Después:
  churn_prob = (churn_pct / 100) ** 2 if churn_pct else None  # Ej: cambio de fórmula
  ```

### Si LLM enriquece post_metadata:

Los valores se usarán automáticamente en `_transform_to_detailed_response()`:
```python
metadata = flat_post.get("post_metadata", {}) or {}
# El LLM puede agregar aquí:
# metadata["subreddit"], metadata["author"], metadata["bug_category"], etc.
# Y se mapearán automáticamente a los nested objects
```

---

## Estructura de Archivos Clave

```
app/modules/monitorization/
├── crud.py                  ← Lógica de transformación
├── router.py                ← Endpoints (usan _transform_to_detailed_response)
├── schemas.py               ← Modelos Pydantic (8 nested objects)
└── __init__.py

src/features/monitorization/
├── types/
│   └── index.ts             ← Interfaces TypeScript
├── services/
│   └── monitorizationService.ts  ← Llamadas API (tipificadas)
├── hooks/
│   └── useMonitorization.ts ← Estados y filtros
└── components/
    └── LiveMonitoringFeed.tsx   ← Componente UI (consume tipos)
```

---

## Valores Por Defecto (Actualmente)

Cuando un campo nested no existe en BD, se usa:

| Field | Default | Fuente |
|-------|---------|--------|
| `sentiment.score` | 0.7 / -0.7 / 0.0 | Mapeado de sentiment simple |
| `sentiment.confidence` | 0.8 | Const |
| `source.engagement.upvotes` | promoter value | BD |
| `source.engagement.comments` | 0 | Const |
| `source.engagement.shares` | 0 | Const |
| `technical_analysis.severity` | Mapeado de alert_type | Mapeo |
| `business_metrics.churn_probability` | churn_percentage / 100 | Cálculo |
| Todos los demás | null | Default |

---

## Testing

```bash
# Backend
cd g-unity-benchmark-backend
python -m pytest app/modules/monitorization/

# Frontend
cd g-unity-benchmark-Frontend
npm run lint
npm run type-check
```

---

## Próximos Pasos (Para Otros Equipos)

### LLM / Data Enrichment
Rellenar `post_metadata` JSONB con:
```python
metadata = {
    "subreddit": "Unity3D",
    "author": "user123",
    "engagement": {"upvotes": 42, "comments": 5, "shares": 0},
    "bug_category": "performance",
    "severity": "high",
    "affected_platforms": ["windows", "macos"],
    "revenue_impact": "medium",
    "user_segment": "enterprise",
    "competitor_mentioned": "unreal",
    "migration_intent": "considering",
    "industry_trend": "growing",
    "adoption_stage": "production",
    "company_size": "51-200",
    "geographic_region": "na",
    "reach": 1200,
    "influence_score": 0.75,
    "key_factors": ["performance", "cost", "support"]
}
```

### Database (Optional)
Considerar agregar campos JSONB específicos a `analyzed_posts`:
```sql
ALTER TABLE analyzed_posts ADD COLUMN IF NOT EXISTS source_data JSONB;
ALTER TABLE analyzed_posts ADD COLUMN IF NOT EXISTS technical_data JSONB;
ALTER TABLE analyzed_posts ADD COLUMN IF NOT EXISTS business_data JSONB;
```

---

## Resumen

- ✅ **Backend**: Devuelve estructura compleja (8 nested objects)
- ✅ **Frontend**: Tipificado end-to-end
- ✅ **Fallbacks**: Valores por defecto seguros
- ✅ **Extensible**: Fácil agregar campos sin romper código
- 🔄 **Datos vacíos**: Listos para que LLM/otros equipos completen

---

## Cambios Recientes (2026-05-15)

Se aplicaron las siguientes modificaciones funcionales y de contrato API que afectan al consumo en frontend:

- Nuevo campo expuesto en la respuesta `MonitorizationPostDetailResponse`: `bug` (opcional). Ahora se devuelve tanto `technical_analysis.bug_category` como `bug` en el nivel plano y anidado.
- Nuevo campo expuesto: `platform_mentioned` — este campo indica la plataforma mencionada en el contenido analizado (unity, unreal, godot, ...). Es distinto de `source.platform` (que indica la fuente social: twitter, reddit, etc.).
- Normalización de valores de bug: valores como `"none"`, `null`, `"n/a"` se consideran ausencia de bug y no deben mostrarse en la UI.
- Endpoint `GET /monitorization/posts` ahora ordena por `date DESC` (y `id DESC` como tiebreaker) para devolver los posts más recientes primero.
- Métrica `count_non_official_monitored_posts` fue ajustada para devolver el tamaño del lote devuelto (`len(posts)`) en la ventana del fetch (antes contaba solo posts no oficiales).

Impacto:

- Frontend: usar `post.platform_mentioned` para mostrar la plataforma (Unity/Unreal/Godot) en los tags.
- Frontend: mostrar tag `Bug` sólo si `post.bug` no es `null` ni `'none'`.
- Operaciones de paging/orden en frontend deben asumir que la respuesta ya viene ordenada por fecha (más reciente primero).

Ejemplo de contrato actualizado (parcial):

```json
{
  "id": "123",
  "title": "Crash on startup",
  "platform_mentioned": "unity",
  "bug": "crash",
  "date": "2026-05-15T12:34:56Z",
  "sentiment": { "label": "negative", "score": -0.7 }
}
```

Si quieres que documente los cambios en el API docs (`/docs`) o agregar ejemplos en `README.md`, lo hago en el siguiente paso.

