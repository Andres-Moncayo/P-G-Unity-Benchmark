# Rutas de APIs - Módulo Competitors

## Base URL
```
http://localhost:8000/api/v1
```

---

## Endpoints del Módulo Competitors

### 1. `/competitors/dashboard`
**Método:** `GET`

**Descripción:** 
Obtiene el dashboard completo de competidores con datos resumidos, métricas por motor, pulso de plataformas, alertas críticas y posts recientes.

**Datos que retorna:**
- `summary`: Resumen de métricas (post count, NPS, alertas, riesgo de churn)
- `engines`: Array de métricas por motor/competidor
- `pulse`: Array de datos de pulso por plataforma
- `critical_alerts`: Array de alertas críticas
- `recent_posts`: Array de posts recientes

**Hook usado:**
- `useCompetitorsData()`

**Caché:**
- Tiempo de validez: 2 minutos
- Refresco automático: 5 minutos

---

### 2. `/competitors/market-positioning`
**Método:** `GET`

**Descripción:**
Obtiene el posicionamiento en el mercado de los competidores, incluyendo segmentos, fortalezas y tendencias.

**Datos que retorna:**
- Array de items con:
  - `id`: ID del item
  - `engine`: Nombre del motor/competidor
  - `platform`: Plataforma
  - `segment`: Segmento de mercado
  - `strength`: Valor de fortaleza (número)
  - `trend`: Tendencia del mercado
  - `recorded_at`: Fecha de registro

**Hook usado:**
- `useMarketPositioning()`

**Caché:**
- Tiempo de validez: 5 minutos

---

### 3. `/competitors/revenue`
**Método:** `GET`

**Descripción:**
Obtiene datos de comparación de ingresos de los competidores por trimestre y plataforma.

**Datos que retorna:**
- `data_points`: Array de puntos de datos con:
  - `quarter`: Trimestre
  - `company`: Nombre de la empresa
  - `platform`: Plataforma
  - `revenue_usd_millions`: Ingresos en millones USD
  - `source_type`: Tipo de fuente (nullable)
- `quarters`: Array de trimestres disponibles

**Hook usado:**
- `useRevenueComparison()`

**Caché:**
- Tiempo de validez: 5 minutos

---

### 4. `/competitors/strategic-initiatives`
**Método:** `GET`

**Descripción:**
Obtiene las iniciativas estratégicas de los competidores, incluyendo descripción, impacto y estado.

**Datos que retorna:**
- Array de items con:
  - `id`: ID de la iniciativa
  - `company`: Nombre de la empresa
  - `platform`: Plataforma
  - `initiative`: Nombre de la iniciativa
  - `description`: Descripción detallada
  - `impact`: Impacto estimado
  - `timeline`: Línea de tiempo
  - `status`: Estado actual
  - `source_url`: URL de la fuente
  - `created_at`: Fecha de creación
  - `updated_at`: Fecha de actualización

**Hook usado:**
- `useStrategicInitiatives()`

**Caché:**
- Tiempo de validez: 5 minutos

---

## Resumen de Hooks Disponibles

| Hook | Endpoint | Propósito |
|------|----------|-----------|
| `useCompetitorsData()` | `/competitors/dashboard` | Dashboard principal con datos completos |
| `useMarketPositioning()` | `/competitors/market-positioning` | Posicionamiento y segmentación de mercado |
| `useRevenueComparison()` | `/competitors/revenue` | Comparación de ingresos |
| `useStrategicInitiatives()` | `/competitors/strategic-initiatives` | Iniciativas estratégicas de competidores |

---

## Archivo de Implementación
- **Ubicación:** `src/features/competitors/hooks/useCompetitorsData.ts`
