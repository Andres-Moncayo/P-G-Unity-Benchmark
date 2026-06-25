-- BASE DE DATOS EN POSTGRESQL PARA UNITY BENCHMARK BACKEND

-- ── EXTENSIONES ─────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ── ROLES ───────────────────────────────────────────────

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,

  name VARCHAR(60) NOT NULL,

  slug VARCHAR(50) NOT NULL UNIQUE,

  description VARCHAR(255),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS ───────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email CITEXT NOT NULL UNIQUE,

  full_name VARCHAR(120) NOT NULL,

  hashed_password VARCHAR(255) NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  role_id BIGINT,

  created_by_id UUID,

  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT fk_users_created_by
    FOREIGN KEY (created_by_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- ── LOGS ────────────────────────────────────────────────

CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID,

  action VARCHAR(100) NOT NULL,

  entity_type VARCHAR(60),

  entity_id VARCHAR(255),

  details JSONB NOT NULL DEFAULT '{}'::jsonb,

  ip_address VARCHAR(45),

  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_logs_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX ix_logs_user_id
  ON logs(user_id);

CREATE INDEX ix_logs_action
  ON logs(action);

CREATE INDEX ix_logs_created_at
  ON logs(created_at);

-- ── ANALYZED POSTS ──────────────────────────────────────

CREATE TABLE analyzed_posts (
  id BIGSERIAL PRIMARY KEY,

  title TEXT NOT NULL,

  summary TEXT,

  url TEXT,

  date_post VARCHAR(20),

  platform VARCHAR(20) NOT NULL,

  sentimental VARCHAR(20) NOT NULL,

  bug VARCHAR(50),

  performance VARCHAR(10),

  churn_risk VARCHAR(20),

  churn_percentage SMALLINT,

  promotor SMALLINT NOT NULL DEFAULT 0,

  detractor SMALLINT NOT NULL DEFAULT 0,

  alert_type VARCHAR(10) NOT NULL DEFAULT 'low',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_platform
    CHECK (platform IN ('Unity', 'unreal', 'godot', 'other')),

  CONSTRAINT chk_sentimental
    CHECK (sentimental IN ('positive', 'negative')),

  CONSTRAINT chk_alert_type
    CHECK (alert_type IN ('low', 'middle', 'high')),

  CONSTRAINT chk_promotor
    CHECK (promotor BETWEEN 0 AND 10),

  CONSTRAINT chk_detractor
    CHECK (detractor BETWEEN 0 AND 10),

  CONSTRAINT chk_churn_pct
    CHECK (
      churn_percentage IS NULL
      OR churn_percentage BETWEEN 0 AND 100
    )
);

CREATE INDEX ix_ap_created_at
  ON analyzed_posts(created_at DESC);

CREATE INDEX ix_ap_platform
  ON analyzed_posts(platform);

CREATE INDEX ix_ap_alert_type
  ON analyzed_posts(alert_type);

-- ── METRIC HISTORY ──────────────────────────────────────

CREATE TABLE metric_history (
  id BIGSERIAL PRIMARY KEY,

  metric_key VARCHAR(100) NOT NULL,

  metric_name VARCHAR(255) NOT NULL,

  value NUMERIC(18,4) NOT NULL,

  unit VARCHAR(30),

  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,

  source VARCHAR(120),

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_metric_history_key_recorded
  ON metric_history(metric_key, recorded_at);

CREATE INDEX ix_metric_history_dimensions_gin
  ON metric_history USING GIN (dimensions);

-- ── CHAT HISTORY ────────────────────────────────────────

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  thread_id UUID NOT NULL DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,

  role VARCHAR(20) NOT NULL,

  content TEXT NOT NULL,

  citations JSONB NOT NULL DEFAULT '{}'::jsonb,

  model_used VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_chat_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT ck_chat_role
    CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX ix_chat_history_thread
  ON chat_history(thread_id, created_at);

CREATE INDEX ix_chat_history_user
  ON chat_history(user_id);

-- ── ALERTS ──────────────────────────────────────────────

CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,

  user_id UUID,

  post_id BIGINT,

  severity VARCHAR(10) NOT NULL DEFAULT 'low',

  title VARCHAR(255) NOT NULL,

  message TEXT,

  is_read BOOLEAN NOT NULL DEFAULT FALSE,

  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_alerts_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT fk_alerts_post
    FOREIGN KEY (post_id)
    REFERENCES analyzed_posts(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  CONSTRAINT ck_alerts_severity
    CHECK (severity IN ('low', 'middle', 'high'))
);

CREATE INDEX ix_alerts_user_unread
  ON alerts(user_id, is_read);

CREATE INDEX ix_alerts_severity
  ON alerts(severity, created_at);


-- BASE DE DATOS POSTGRESQL SIMPLIFICADA PARA DESARROLLO LOCAL

-- =========================================================
-- EXTENSIONES
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ROLES
-- =========================================================

CREATE TABLE roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,

  role_id BIGINT,
  created_by_id UUID,

  last_login_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_users_created_by
    FOREIGN KEY (created_by_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- LOGS
-- =========================================================

CREATE TABLE logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_id UUID,

  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60),
  entity_id VARCHAR(255),

  details JSONB DEFAULT '{}'::jsonb,

  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_logs_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX ix_logs_user_id
  ON logs(user_id);

CREATE INDEX ix_logs_action
  ON logs(action);

CREATE INDEX ix_logs_created_at
  ON logs(created_at);

-- =========================================================
-- ANALYZED POSTS
-- =========================================================

DO $$
BEGIN
  CREATE TYPE categoria_negocio AS ENUM (
    'general',
    'product',
    'finance',
    'ecosystem',
    'positioning'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE analyzed_posts (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    summary TEXT,
    url TEXT,
    date_post TIMESTAMP,
    source_platform TEXT,
    source_subreddit TEXT,
    source_author TEXT,
    upvotes INTEGER,
    comments INTEGER,
    shares INTEGER,
    sentiment_score FLOAT,
    sentiment_label sentiment_label_enum,
    sentiment_confidence FLOAT,
    platform_mentioned TEXT,
    bug_category TEXT,
    severity severity_enum,
    unity_version TEXT,
    affected_platforms TEXT[],
    churn_risk risk_enum,
    churn_probability FLOAT,
    revenue_impact impact_enum,
    user_segment TEXT,
    competitor_mentioned TEXT,
    comparison_type TEXT,
    migration_intent migration_enum,
    sentiment_strength FLOAT,
    would_recommend BOOLEAN,
    key_factors TEXT[],
    industry_trend trend_enum,
    adoption_stage stage_enum,
    company_size TEXT,
    geographic_region region_enum,
    alert_type alert_category_enum,
    alert_urgency severity_enum,
    alert_reach INTEGER,
    alert_influence_score FLOAT,
    business_category business_category_enum,
    platform VARCHAR(50) NOT NULL DEFAULT 'unity'
);

-- =========================================================
-- METRIC HISTORY
-- =========================================================

CREATE TABLE metric_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  metric_key VARCHAR(100) NOT NULL,
  metric_name VARCHAR(255) NOT NULL,

  value DECIMAL(18,4) NOT NULL,

  unit VARCHAR(30),

  dimensions JSONB DEFAULT '{}'::jsonb,

  source VARCHAR(120),

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_metric_history_key_recorded
  ON metric_history(metric_key, recorded_at);

-- =========================================================
-- CHAT HISTORY
-- =========================================================

CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  thread_id UUID NOT NULL,

  user_id UUID NOT NULL,

  role VARCHAR(20) NOT NULL,

  content TEXT NOT NULL,

  citations JSONB DEFAULT '{}'::jsonb,

  model_used VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_chat_history_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT chk_chat_role
    CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX ix_chat_history_thread
  ON chat_history(thread_id, created_at);

CREATE INDEX ix_chat_history_user
  ON chat_history(user_id);

-- =========================================================
-- ALERTS
-- =========================================================

CREATE TABLE alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_id UUID,

  post_id BIGINT,

  severity VARCHAR(10) DEFAULT 'low',

  title VARCHAR(255) NOT NULL,

  message TEXT,

  is_read BOOLEAN DEFAULT FALSE,

  read_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_alerts_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_alerts_post
    FOREIGN KEY (post_id)
    REFERENCES analyzed_posts(id)
    ON DELETE CASCADE,

  CONSTRAINT chk_alerts_severity
    CHECK (severity IN ('low', 'middle', 'high'))
);

CREATE INDEX ix_alerts_user_unread
  ON alerts(user_id, is_read);

CREATE INDEX ix_alerts_severity
  ON alerts(severity, created_at);

-- =========================================================
-- DATOS INICIALES DE ROLES
-- =========================================================

INSERT INTO roles (name, slug, description)
VALUES
  ('Administrator', 'admin', 'System administrator'),
  ('Developer', 'developer', 'Developer user'),
  ('Analyst', 'analyst', 'Data analyst user');








CREATE INDEX ix_mp_created_at
  ON mined_posts(created_at);

CREATE INDEX ix_mp_engine
  ON mined_posts(platform_mentioned);

CREATE INDEX ix_mp_source_platform
  ON mined_posts(source_platform);

CREATE INDEX ix_mp_alert_type
  ON mined_posts(alert_type);

CREATE INDEX ix_mp_id
  ON mined_posts(id);








-- Índices obligatorios para velocidad
CREATE INDEX ix_mp_created_at ON mined_posts(created_at);
CREATE INDEX ix_mp_engine ON mined_posts(platform_mentioned);
CREATE INDEX ix_mp_source_platform ON mined_posts(source_platform);
CREATE INDEX ix_mp_alert_type ON mined_posts(alert_type);
CREATE INDEX ix_mp_id ON mined_posts(id);


