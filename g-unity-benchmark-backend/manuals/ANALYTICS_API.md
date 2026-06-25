# Analytics API — Presentation Reference

**Base URL (local):** `http://127.0.0.1:8000`  
**Prefix:** `/api/analytics`  
**Tag (OpenAPI):** `Analytics`  
**Data source:** Existing PostgreSQL table `posts` (falls back to `analyzed_posts` if needed). **No new tables are created.**

All public chart endpoints accept the same optional filter. Responses are JSON. On database failure, the API returns **503** with a structured error payload (`AnalyticsDatabaseUnavailable`).

### Authentication

All `/api/analytics/*` endpoints require a valid **JWT access token** (same login as the rest of the app).

1. Obtain tokens: `POST /api/v1/identity/auth/login` (form-urlencoded: `username=<email>`, `password=<password>`).
2. Send on every analytics request: `Authorization: Bearer <access_token>`.
3. Without a token or with an expired/invalid token → **401 Unauthorized**.
4. Inactive user → **403 Forbidden**.

In Swagger UI, use **Authorize** (OAuth2) after login; the token applies to Analytics routes as well.

---

## Common query parameter: `business`

| Value | View |
|--------|------|
| *(omit)* / `general` / `all` | **General** — full corpus |
| `product` / `producto` | **Product** pillar |
| `finance` / `finanzas` | **Finance** pillar |
| `ecosystem` / `ecosistema` | **Ecosystem** pillar |
| `positioning` / `posicionamiento` | **Positioning** pillar |

**How filtering works:** Posts are subset before aggregation using `business_category` (canonical JSON / DB column) when present, else `metadata.strategic_pillar` / `pillar` / `business_theme`, else keyword and `bug_category` rules in `filter_posts_for_strategic_pillar`. **Formulas stay the same**; only the input rows change. See `manuals/ANALYTICS_JSON_SCHEMA_DELTA.md` for the full JSON ↔ column map.

**Example:**  
`GET /api/analytics/summary?business=product`

---

## Endpoints overview

| Method | Path | Frontend chart / use |
|--------|------|----------------------|
| `GET` | `/api/analytics/summary` | KPI cards (top of dashboard) |
| `GET` | `/api/analytics/market-share-trend` | Market share over time |
| `GET` | `/api/analytics/market-share-vs-satisfaction` | Share vs satisfaction scatter |
| `GET` | `/api/analytics/developer-satisfaction` | Developer satisfaction by year |
| `GET` | `/api/analytics/satisfaction-by-dimension` | Satisfaction by dimension |
| `GET` | `/api/analytics/performance-gap` | Performance gap chart |
| `GET` | `/api/analytics/global-sentiment-nps` | Sentiment & NPS by engine |

---

## 1. `GET /api/analytics/summary`

**Purpose:** High-level KPI cards for the Analytics dashboard (up to 8 items).

**Query parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `business` | string | No | Strategic pillar filter (see table above) |

**Response:** `200` — `application/json` — array of:

```json
{
  "label": "Unity NPS",
  "value": "42.5",
  "change": "+3.2 pts",
  "trend": "positive",
  "formula": "NPS = ((promoters − detractors) / (promoters + detractors)) × 100 …",
  "description": "Estimated Net Promoter Score for Unity posts in scope."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | KPI title shown in the UI |
| `value` | string | Formatted metric value |
| `change` | string | Delta vs comparison period |
| `trend` | `"positive"` \| `"negative"` \| `"neutral"` | Direction for styling |
| `formula` | string \| null | Human-readable formula (includes pillar scope when filtered) |
| `description` | string \| null | Short explanation for the card |

**Logic (summary):** Aggregates scoped posts into metrics such as NPS, share of voice, churn risk, and alert counts. Each item includes `formula` / `description` for transparency in the presentation.

---

## 2. `GET /api/analytics/market-share-trend`

**Purpose:** Voice share by calendar quarter (% of posts per game engine).

**Query parameters:** `business` (optional)

**Response:** `200` — array of:

```json
{
  "period": "Q1 2025",
  "month": "Q1 2025",
  "quarter": "Q1 2025",
  "unity": 45.2,
  "unreal": 32.1,
  "godot": 18.0,
  "other": 4.7
}
```

**Formula:** For each quarter,  
`engine_% = (posts for engine / total posts in quarter) × 100`  
Engines: `unity`, `unreal`, `godot`, `other`.

---

## 3. `GET /api/analytics/market-share-vs-satisfaction`

**Purpose:** Compare **share of voice** (post count %) vs **average satisfaction** (0–10) per engine — scatter chart.

**Query parameters:** `business` (optional)

**Response:** `200` — array of:

```json
{
  "segment": "Unity",
  "label": "Unity",
  "share": 38.5,
  "satisfaction": 7.2,
  "benchmark": 6.8
}
```

| Field | Description |
|-------|-------------|
| `share` | % of scoped posts for that engine |
| `satisfaction` | Mean score 0–10 from promoter/detractor signal; `null` if no scored posts |
| `benchmark` | Mean satisfaction across all scored posts in scope |

**Notes:** Engines with **0% share** are omitted. Satisfaction uses normalized `sentiment_score` when `has_promotor_signal` is true.

---

## 4. `GET /api/analytics/developer-satisfaction`

**Purpose:** Average developer satisfaction by **year** and engine (line/bar chart).

**Query parameters:** `business` (optional)

**Response:** `200` — array of:

```json
{
  "year": "2025",
  "unity": 7.4,
  "unreal": 6.9,
  "godot": 8.1
}
```

**Formula:** Per year and engine, mean of scores mapped to 0–10 from post sentiment/promoter signals. `null` when no scored posts for that cell.

---

## 5. `GET /api/analytics/satisfaction-by-dimension`

**Purpose:** Satisfaction broken down by issue dimension (derived from `bug` / `bug_category`).

**Query parameters:** `business` (optional)

**Response:** `200` — array of:

```json
{
  "dimension": "Performance",
  "unity": 7.0,
  "unreal": 6.5,
  "godot": 7.8,
  "benchmark": 7.1
}
```

**Dimensions:** `performance`, `crash`, `ui`, `api`, `documentation` (capitalized in response).

**Formula:** Mean satisfaction 0–10 per engine within each dimension; `benchmark` = mean across engines for that dimension.

---

## 6. `GET /api/analytics/performance-gap`

**Purpose:** Comparative proxies for engagement and churn risk by engine (radar/bar chart).

**Query parameters:** `business` (optional)

**Response:** `200` — array of:

```json
{
  "metric": "Iteration Time (s)",
  "unity": 42.5,
  "unreal": 38.0,
  "godot": 51.2
}
```

| Metric label | Underlying proxy |
|--------------|------------------|
| `Iteration Time (s)` | Engagement: `min(100, (upvotes + comments + shares) / 5)` averaged per engine |
| `Build Size (MB)` | Churn: mean of `churn_probability × 100` when present |

Rows appear only if the underlying data exists for at least one engine.

---

## 7. `GET /api/analytics/global-sentiment-nps`

**Purpose:** Estimated NPS and sentiment mix per engine (Unity, Unreal, Godot).

**Query parameters:** `business` (optional)

**Response:** `200` — object:

```json
{
  "benchmark_nps": 12.5,
  "unity_below_benchmark": false,
  "platforms": [
    {
      "platform": "Unity",
      "nps": 15.0,
      "sentiment_positive": 52.3,
      "sentiment_neutral": 30.1,
      "sentiment_negative": 17.6
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `benchmark_nps` | Mean NPS across engines with data |
| `unity_below_benchmark` | `true` if Unity NPS &lt; benchmark |
| `platforms[].nps` | `100 × (promoters − detractors) / (promoters + detractors)` using `would_recommend` |
| `sentiment_*` | % of posts positive / neutral / negative by `sentiment_label` |

---

## Error responses

| Status | When |
|--------|------|
| `503` | PostgreSQL unreachable or analytics query failed (`detail` explains DB unavailable) |
| `500` | Unexpected server error |

**Health check (not under `/api/analytics`):**  
`GET /health` → `{"status": "healthy"}`

---       

## Quick test (presentation demo)

```bash
# KPIs — General view
curl "http://127.0.0.1:8000/api/analytics/summary"

# Same KPIs — Product pillar
curl "http://127.0.0.1:8000/api/analytics/summary?business=product"

# Scatter chart data
curl "http://127.0.0.1:8000/api/analytics/market-share-vs-satisfaction"

# NPS by engine
curl "http://127.0.0.1:8000/api/analytics/global-sentiment-nps?business=ecosystem"
```

**Interactive docs:** `http://127.0.0.1:8000/docs` → section **Analytics**

---

## Architecture note (for slides)

```text
Frontend (React + TanStack Query)
    → GET /api/analytics/*?business=...
        → posts_aggregate (filter + formulas)
            → PostgreSQL table `posts` (existing data)
```

No ETL pipeline required for the MVP: analytics **reads and aggregates** community posts already stored in the database.
