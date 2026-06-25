# Analytics — Canonical JSON vs database columns

Analytics reads **existing** tables only. It normalizes each row (flat columns, nested JSON in `metadata`, or the canonical document shape) into one internal dict so **charts keep working** while you migrate the DB.

**Canonical JSON** (LLM / ingest contract):

```json
{
  "id": "string",
  "platform": "string",
  "title": "string",
  "summary": "string",
  "url": "string",
  "date": "timestamp",
  "source": {
    "platform": "reddit|twitter|stackoverflow|discord",
    "subreddit": "string",
    "author": "string",
    "engagement": { "upvotes": "number", "comments": "number", "shares": "number" }
  },
  "sentiment": {
    "score": "number (-1 to 1)",
    "label": "positive|negative|neutral",
    "confidence": "number (0-1)"
  },
  "platform_mentioned": "unity|unreal|godot|others",
  "technical_analysis": {
    "bug_category": "performance|crash|ui|api|documentation",
    "severity": "low|medium|high|critical",
    "unity_version": "string",
    "affected_platforms": ["ios", "android", "web", "standalone"]
  },
  "business_metrics": {
    "churn_risk": "low|medium|high",
    "churn_probability": "number (0-1)",
    "revenue_impact": "estimated_low|medium|high",
    "user_segment": "indie|pro_enterprise|enterprise"
  },
  "competitive_intelligence": {
    "competitor_mentioned": "unreal|godot|other",
    "comparison_type": "performance|cost|features|support",
    "migration_intent": "none|considering|migrated_from|migrated_to"
  },
  "nps_indicators": {
    "sentiment_strength": "number (-2 to 2)",
    "would_recommend": "boolean",
    "key_factors": ["performance", "cost", "support", "features"]
  },
  "market_signals": {
    "industry_trend": "growing|stable|declining",
    "adoption_stage": "evaluation|implementation|production",
    "company_size": "solo|1-10|11-50|51-200|200+",
    "geographic_region": "na|emea|apac|latam"
  },
  "alert_metadata": {
    "type": "technical|financial|competitive|community",
    "urgency": "low|medium|high|critical",
    "reach": "number",
    "influence_score": "number"
  },
  "business_category": "general|producto|finanzas|ecosistema|posicionamiento"
}
```

> **Note:** Add a comma after `alert_metadata` in your source JSON before `business_category` if you store the full object in a file.

---

## What Analytics uses today (charts still work)

| Internal field (after normalize) | Primary source in new JSON | Used by |
|-----------------------------------|----------------------------|---------|
| `platform` (engine) | `platform_mentioned` | All charts by engine |
| `dt` | `date` | Market share trend |
| `sentiment_label` | `sentiment.label` | NPS / sentiment |
| `sentiment_score` | `sentiment.score` or promoter/detractor | Satisfaction, scatter |
| `bug_category` | `technical_analysis.bug_category` | Satisfaction by dimension |
| `severity`, `alert_type`, `alert_urgency` | `technical_analysis.severity`, `alert_metadata` | KPI high alerts |
| `churn_probability` | `business_metrics.churn_probability` | Performance gap, KPIs |
| `would_recommend` | `nps_indicators.would_recommend` | Global NPS |
| `upvotes`, `comments`, `shares` | `source.engagement.*` | Performance gap |
| `business_category` | `business_category` | `?business=` filter |

Fields **not yet driving a chart** (safe to add in DB/JSON for future): `competitive_intelligence`, `market_signals`, `revenue_impact`, `user_segment`, `alert_metadata.reach`, etc.

---

## Column / type changes for DB owner (please align `analyzed_posts` or `posts`)

Status on a typical Neon `analyzed_posts` (checked 2026-05-19):

| JSON path | Suggested column | Type in PG today | Action |
|-----------|------------------|------------------|--------|
| `id` | `id` | `bigint` | OK |
| `title`, `summary`, `url` | same | `text` | OK |
| `date` | `date_post` | `timestamp` | OK (name differs) |
| `source.platform` | `source_platform` | `text` | OK |
| `source.subreddit` | `source_subreddit` | `text` | OK |
| `source.author` | `source_author` | `text` | OK |
| `source.engagement.upvotes` | `upvotes` | `integer` | OK |
| `source.engagement.comments` | `comments` | `integer` | OK |
| `source.engagement.shares` | `shares` | `integer` | OK |
| `sentiment.score` | `sentiment_score` | `double precision` | OK |
| `sentiment.label` | `sentiment_label` | `USER-DEFINED` (enum) | OK |
| `sentiment.confidence` | `sentiment_confidence` | `double precision` | OK |
| `platform_mentioned` | `platform_mentioned` | `text` | OK — **use for engine**, not `source.platform` |
| `technical_analysis.bug_category` | `bug_category` | `text` | OK |
| `technical_analysis.severity` | `severity` | `severity_enum` | OK |
| `business_metrics.churn_risk` | `churn_risk` | `risk_enum` | OK |
| `business_metrics.churn_probability` | `churn_probability` | `double precision` | OK |
| `alert_metadata.type` | `alert_type` | `alert_category_enum` | OK |
| `alert_metadata.urgency` | `alert_urgency` | `severity_enum` | OK |
| `nps_indicators.would_recommend` | `would_recommend` | `boolean` nullable | **Canonical NPS signal** — replaces `promotor`/`detractor`. True = promoter, False = detractor, NULL = ignored |
| `business_category` | *(missing)* | — | **ADD** `varchar` or `categoria_negocio` enum: `general`, `producto`, `finanzas`, `ecosistema`, `posicionamiento` |
| `platform` (top-level, legacy) | `platform` | `varchar` | **Deprecated for analytics** — use `platform_mentioned` only |
| Full nested doc | `metadata` | `jsonb` on `posts` only | Optional: store entire canonical JSON in `posts.metadata` |

### MVP table `posts` (Alembic)

Still flat: `sentiment`, `bug`, `promoter`, `detractor`, `metadata` JSONB. Analytics merges nested JSON from `metadata` when present; otherwise uses flat columns (unchanged behavior).

---

## Code touched (analytics only)

| File | Role |
|------|------|
| `app/modules/analytics/post_normalizer.py` | Maps canonical / flat / legacy → internal dict |
| `app/modules/analytics/posts_aggregate.py` | Uses normalizer; rich `analyzed_posts` SQL when columns exist |
| `manuals/ANALYTICS_API.md` | API reference (unchanged endpoints) |

No Alembic migrations were added in this change.
