# Integración de Monitorización — Arquitectura y Guía de Implementación

Este documento describe la arquitectura completa de la feature de monitorización del frontend, incluyendo flujo de datos, gestión de estado, filtering, styling y componentes.

---

## Arquitectura General

### Flujo de Datos

```
Backend (FastAPI) → Service Layer → useMonitorization Hook → Components
   ↓
GET /monitorization/posts (general posts)
   ↓
20 posts en memoria local (React state)
   ↓
Filtros aplicados localmente:
 - Sentiment filter (All/Negative/Positive)
 - Search query (case-insensitive matching)
   ↓
Resultados filtrados → LiveMonitoringFeed
   ↓
Paginación (10 items por página)
```

### Patrones Clave

1. **Fetch Once, Filter Locally**: El backend devuelve 20 posts generales. Todo filtrado (sentimiento, búsqueda) ocurre en el frontend con `useMemo` para evitar refetches innecesarios.

2. **Global Refresh Token**: El header dispara un refresh manual incrementando un token en Zustand. Los contenedores escuchan cambios y llaman `refresh()` en el hook.

3. **Feature-First Architecture**: Todo el código de monitorización está bajo `src/features/monitorization/` con subcarpetas: `services/`, `hooks/`, `components/`, `containers/`, `types/`, `index.ts`.

4. **Styling Figma-Inspired**: Paleta gris-first con acentos de color (naranja, azul, púrpura, cian) en bordes, sombras y fondos tintados.

---

## Capas Implementadas

### 1. Service Layer (`src/features/monitorization/services/monitorizationService.ts`)

Centraliza todos los wrappers del backend:

```typescript
// Función principal: fetch general de posts
async function listPosts(params?: {
  sentiment?: string;
  platform?: string;
  skip?: number;
  limit?: number;
}): Promise<Post[]>

// Funciones auxiliares de conteo y búsqueda
async function getMonitoredForums(): Promise<number | null>
async function getMonitoredBugs(): Promise<number | null>
async function countPosts(): Promise<number | null>
async function countNonOfficialPosts(): Promise<number | null>
```

**Nota**: `listPosts()` NO envía parámetro `sentiment` al backend; siempre trae posts generales. El filtrado ocurre en el frontend.

### 2. Custom Hook (`src/features/monitorization/hooks/useMonitorization.ts`)

Gestiona todo el estado y lógica de datos:

```typescript
const {
  posts,           // Array de posts filtrados (resultado del useMemo)
  allPosts,        // Array de todos los posts cargados del backend
  loading,         // boolean
  error,           // Error | null
  stats,           // { forumsCount, bugsCount, competitorsCount, nonOfficialCount }
  sentimentFilter, // string | null ("Negative" | "Positive" | null)
  searchQuery,     // string
  refresh,         // () => Promise<void>
  setParams,       // (params) => void
} = useMonitorization();
```

**Características:**
- `useMemo` filtra `allPosts` por `sentimentFilter` y `searchQuery` en una pasada
- Búsqueda case-insensitive en: título, resumen, tags, categoría
- `refresh()` estable con `useRef` (no causa loops)
- `setParams()` actualiza filtros y refuerza refetch si es necesario

### 3. Container Orchestrator (`src/features/monitorization/containers/MonitorizationContainer.tsx`)

Orquesta todo el flujo visual:

```typescript
export function MonitorizationContainer() {
  const { monitorizationRefreshToken, triggerMonitorizationRefresh } = useNavigationStore();
  const { posts, loading, refresh, setParams } = useMonitorization();

  // Escucha cambios en refreshToken → ejecuta refresh()
  useEffect(() => {
    if (firstRender) return; // Skip primera montada
    refresh();
  }, [monitorizationRefreshToken]);

  const handleFilterChange = (sentiment: string | null, searchQuery: string) => {
    setParams({ sentiment, searchQuery });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <FeedStats stats={stats} />
      <BusinessFilters onFilterChange={handleFilterChange} />
      <LiveMonitoringFeed posts={posts} loading={loading} />
    </div>
  );
}
```

### 4. Gestión de Estado Global (`src/store/useNavigationStore.ts`)

Patrón de token para refresh manual:

```typescript
const useNavigationStore = create((set) => ({
  monitorizationRefreshToken: 0,
  
  triggerMonitorizationRefresh: () =>
    set((state) => ({
      monitorizationRefreshToken: state.monitorizationRefreshToken + 1,
    })),
}));
```

El header hace click → incrementa token → container detecta cambio → ejecuta `refresh()`.

---

## Componentes Visuales

### FeedStats (Métricas)

**Ubicación**: `src/features/monitorization/components/FeedStats.tsx`

**Características:**
- 4 tarjetas de métrica: Foros, Noticias, Reportes, Social
- Colores distintivos con sombras y bordes:
  - **Foros**: Naranja (`border-orange-500/35`, `bg-orange-500/6`, `text-orange-300`)
  - **Noticias**: Azul (`border-blue-500/35`, `bg-blue-500/6`, `text-blue-200`)
  - **Reportes**: Púrpura (`border-purple-500/35`, `bg-purple-500/6`, `text-purple-200`)
  - **Social**: Cian (`border-cyan-500/35`, `bg-cyan-500/6`, `text-cyan-200`)
- Indicador visual (punto de color) junto al label "Live metric"
- Efecto hover: elevación suave (`hover:-translate-y-0.5`)
- Grid responsive: 4 columnas en desktop

**Implementación:**
```typescript
const display = [
  {
    label: 'Foros monitoreados',
    value: stats.forumsCount ?? '—',
    accent: 'border-orange-500/35 shadow-[...]',
    valueColor: 'text-orange-300',
    bgClass: 'bg-orange-500/6',
  },
  // ... más tarjetas
];
```

### BusinessFilters (Controles)

**Ubicación**: `src/features/monitorization/components/BusinessFilters.tsx`

**Características:**
- Input de búsqueda con ícono FontAwesome `faSearch` (lupa) posicionado a la izquierda
- Tres botones de sentimiento: "All", "Negative", "Positive"
- Botones activos resaltados en azul (`bg-blue-500/20`, `border-blue-500`)
- Input con fondo `bg-gray-900` y borde `border-gray-800/70`
- Texto de placeholder dinámico ("Search posts...")

**Callback:**
```typescript
onFilterChange({
  sentiment: "Negative" | "Positive" | null,
  searchQuery: "texto de búsqueda"
})
```

### LiveMonitoringFeed (Feed Paginado)

**Ubicación**: `src/features/monitorization/components/LiveMonitoringFeed.tsx`

**Características:**
- Paginación: `PAGE_SIZE = 10` elementos por página
- Controles de navegación: Botones anterior/siguiente con íconos chevron
- **Sin IDs visibles**: Se aplica `stripVisibleIdPrefix()` al título
- Indicador de sentimiento: Punto de color (no número)
  - Rojo para "Negative"
  - Verde para "Positive"
  - Gris para "Neutral"
- Estado vacío: Mensaje cuando no hay posts que coincidan con filtros
- Estado loading: Spinner animado

**Helpers:**

```typescript
// Elimina prefijos de ID como "123 - ", "#123 - ", "id:123 - " del texto
function stripVisibleIdPrefix(text: string): string {
  return text.replace(/^(?:id|post|post id|post_id)?\s*[:#-]?\s*\d+\s*[-:–—]?\s*/i, '');
}

// Normaliza strings de sentimiento (Spanish/English) → English
function formatSentimentLabel(sentiment: string): string {
  // "negativo" → "Negative", "positivo" → "Positive", "neutral" → "Neutral"
}

// Mapea categorías Spanish → English
function formatBusinessLabel(business: string): string {
  // "foro" → "Forum", "noticias" → "News", "bugs" → "Bugs", etc.
}

// Devuelve clases CSS para color de sentimiento
function getSentimentColor(sentiment: string): string {
  // Red para neg, green para pos, gray para neutral
}

// Devuelve clase CSS para punto de color
function getSentimentDotColor(sentiment: string): string {
  // bg-red-400, bg-green-400, bg-gray-500
}
```

**Estructura de Post:**
```typescript
interface Post {
  source: string;
  time: string;
  business: string;
  sentiment: string;
  title: string;
  tags: string[];
  relevance: number;
}
```

---

## Flujo de Interacción Completo

### 1. Carga Inicial
```
Usuario abre MonitorizationPage
  ↓
MonitorizationContainer monta
  ↓
useMonitorization monta → fetch /monitorization/posts
  ↓
20 posts guardados en allPosts
  ↓
Render: FeedStats + BusinessFilters + LiveMonitoringFeed (10 items, página 0)
```

### 2. Filtrar por Sentimiento
```
Usuario hace click en botón "Negative"
  ↓
BusinessFilters llama onFilterChange({ sentiment: "Negative" })
  ↓
setParams() en hook actualiza sentimentFilter
  ↓
useMemo se recalcula → filtra allPosts donde sentiment.includes("neg")
  ↓
posts retorna solo items negativos
  ↓
LiveMonitoringFeed re-renderiza con nuevos posts, reset a página 0
```

### 3. Buscar
```
Usuario escribe en input "Unity"
  ↓
BusinessFilters llama onFilterChange({ searchQuery: "unity" })
  ↓
setParams() en hook actualiza searchQuery
  ↓
useMemo filtra allPosts donde [title, summary, tags, sentiment].some(field ∋ "unity")
  ↓
posts retorna solo matches
  ↓
LiveMonitoringFeed re-renderiza, reset a página 0
```

### 4. Refresh Manual
```
Usuario hace click en "Update" button en header
  ↓
Header llama useNavigationStore().triggerMonitorizationRefresh()
  ↓
monitorizationRefreshToken se incrementa
  ↓
MonitorizationContainer escucha cambio (useEffect)
  ↓
Llama refresh() del hook
  ↓
Hook hace fetch /monitorization/posts nuevamente
  ↓
allPosts se actualiza
  ↓
useMemo se recalcula con nuevos posts
  ↓
LiveMonitoringFeed muestra nuevos datos
```

---

## Layout y Spacing

**Container Wrapper:**
```typescript
<div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
  {/* Responsive padding y vertical spacing */}
</div>
```

- **Padding horizontal**: 4 unidades (16px) en mobile, 6 (24px) en tablet, 8 (32px) en desktop
- **Padding vertical**: 6 unidades (24px) arriba y abajo
- **Spacing vertical entre bloques**: 6 unidades (24px) entre FeedStats, BusinessFilters y LiveMonitoringFeed

---

## Styling System

### Paleta de Colores

**Base (Oscuro):**
- `bg-gray-900` para fondos principales
- `border-gray-800/70` para bordes sutiles
- `text-gray-300`, `text-gray-400`, `text-gray-500` para textos terciarios

**Acentos (Figma-Inspired):**
- **Naranja**: Foros (border-orange-500/35, bg-orange-500/6, text-orange-300)
- **Azul**: Noticias (border-blue-500/35, bg-blue-500/6, text-blue-200)
- **Púrpura**: Reportes (border-purple-500/35, bg-purple-500/6, text-purple-200)
- **Cian**: Social (border-cyan-500/35, bg-cyan-500/6, text-cyan-200)

**Sentimientos:**
- **Negative**: Red (text-red-200, bg-red-500/10, border-red-500/30)
- **Positive**: Emerald/Green (text-emerald-200, bg-emerald-500/10, border-emerald-500/30)
- **Neutral**: Gray (text-gray-200, bg-gray-800/70, border-gray-700)

### Sombras Personalizadas

```typescript
// Ejemplo para Foros (Naranja)
shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_0_24px_rgba(249,115,22,0.08)]
// Inner border + outer glow
```

---

## Archivos Clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `services/monitorizationService.ts` | Wrappers de API backend |
| `hooks/useMonitorization.ts` | Gestión de estado y filtrado local |
| `containers/MonitorizationContainer.tsx` | Orquestración de componentes + refresh global |
| `components/FeedStats.tsx` | Tarjetas de métricas con colores |
| `components/BusinessFilters.tsx` | Input de búsqueda + botones sentimiento |
| `components/LiveMonitoringFeed.tsx` | Feed paginado + stripping IDs |
| `index.ts` | Barrel export (`MonitorizationContainer`) |
| `src/store/useNavigationStore.ts` | Global `monitorizationRefreshToken` |
| `src/components/layout/Header.tsx` | Botón Update dispara refresh |

---

## Notas de Implementación

1. **No Hay Hard Delete en IDs**: Se usan regex soft-stripping en `stripVisibleIdPrefix()`. Si el backend devuelve `"123 - Title"`, se limpia a `"Title"`.

2. **Paginación Local**: La paginación ocurre en el cliente sobre posts ya filtrados. No hay sync con backend.

3. **Búsqueda Case-Insensitive**: `.toLowerCase()` en ambas partes (query y datos).

4. **Sentimiento Multilang**: Los helpers normalizan tanto Spanish ("negativo") como English ("negative") → consistent output.

5. **Estabilidad del Hook**: `refresh()` se envuelve en `useCallback` con `useRef` interna para evitar recreación innecesaria.

---

## Verificación y Testing

✅ **Completado:**
- TypeScript strict mode sin errores
- Flujo de datos de backend → hook → componentes funcionando
- Filtros locales (sentimiento + búsqueda) aplicándose correctamente
- Paginación avanzando/retrocediendo sin bugs
- ID stripping quitando prefijos visibles
- Header button disparando refresh manual
- Styling Figma-inspired aplicado (bordes, sombras, fondos tintados)
- Search icon (FontAwesome lupa) en input

**Cómo Testear Manualmente:**
1. Abrir monitorization page → debe cargar 20 posts

---

## Cambios Recientes (2026-05-15)

Resumen de ajustes aplicados recientemente que afectan al fetch y renderizado:

- Exposición de campos nuevos en la respuesta del backend: `platform_mentioned` y `bug`.
- El frontend ahora usa `platform_mentioned` para el tag de plataforma (muestra `Unity`, `Unreal`, `Godot`, etc.) en lugar de `source.platform` (twitter/reddit).
- El tag de `Bug` aparece solo si `bug` tiene un valor distinto de `none` / `null` / `n/a`. Se normaliza en frontend antes de mostrar.
- El feed muestra por defecto estos tags: `Sentiment`, `Platform` (platform_mentioned), `Business Category`; y si aplica, `Bug` + tipo de bug.
- Se eliminó el uso de `key_factors` como tags primarios en la lista principal; `key_factors` permanece disponible en `nps_indicators`.
- Paginación y orden: el backend devuelve los 20 posts del fetch ordenados por date descendente (más recientes primero); el frontend respeta ese orden y sigue paginando localmente a 10 por página.

Impacto para desarrolladores:

- Si consumes la API `/monitorization/posts`, ahora recibirás `platform_mentioned` y `bug` en cada objeto de post.
- Para filtrar o renderizar plataformas (Unity/Unreal/Godot) usa `post.platform_mentioned`.
- Para decidir si mostrar un tag de bug, considera valores como `null`, `"none"`, `"n/a"` como ausencia de bug.

Ejemplo (nuevo shape parcial):

```json
{
  "id": "123",
  "title": "Crash on start",
  "platform_mentioned": "unity",
  "bug": "crash",
  "sentiment": { "label": "negative", "score": -0.7 },
  "business_category": "product",
  ...
}
```

---
2. Hacer click en "Negative" → filtra a posts con "Negative"
3. Escribir "Unity" en search → filtra a posts que contengan "Unity"
4. Cambiar página (chevrons) → muestra 10 items siguientes
5. Click "Update" en header → recarga posts del backend
6. Verificar que no hay IDs visibles (ej: "123 -" removido del título)
