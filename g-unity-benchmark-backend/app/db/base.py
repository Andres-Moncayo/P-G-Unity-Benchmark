"""Registro central de modelos.

Importar este módulo garantiza que TODOS los modelos del proyecto estén
registrados en `Base.metadata`. Lo consumen:

- alembic/env.py (autogenerate de migraciones).
- Tests que necesitan crear el schema completo.

Cada nuevo modelo que añadas, agrégalo aquí. Es la única "lista" de modelos
que existe en el proyecto.

Tablas actuales (migración 001 + siguientes):
  roles, users, logs, posts, metric_history, chat_history, alerts, analyzed_posts
"""
# noqa: F401  — los imports son intencionales para registrar los modelos.

# Identity (roles, users, logs)
from app.modules.identity.models import Log, Role, User  # noqa: F401

# Market Intelligence (posts)
from app.modules.market_intelligence.models import Post  # noqa: F401

# Metrics (metric_history, analyzed_posts)
from app.modules.metrics.analyzed_post_model import AnalyzedPost  # noqa: F401
from app.modules.metrics.models import MetricHistory  # noqa: F401

# Assistant (chat_history)
from app.modules.assistant.models import ChatHistory  # noqa: F401

# Alerts (alerts)
from app.modules.alerts.models import Alert  # noqa: F401

# Analytics — modelos de hechos: `posts` (MVP) y opcional `analyzed_posts` (legacy) para inspección.
# NOTE: `analyzed_posts` model exists in `metrics` and `analytics` (legacy). Importing
# both registers the same table twice in the same MetaData and raises an SQLAlchemy
# error. Keep the canonical model from `metrics` imported above. If you need the
# legacy analytics model for inspection, import it explicitly where required.

# Opportunities — sin tablas por ahora (módulo placeholder)
# Simulation  — sin tablas por ahora (módulo placeholder)
