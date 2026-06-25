from core.config import settings
import sqlalchemy as sa
engine = sa.create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    for col in ['platform_mentioned','competitor_mentioned','alert_urgency','sentiment_label']:
        vals = conn.execute(sa.text(f"select distinct {col} from analyzed_posts order by {col} nulls last limit 50")).all()
        print(col, [v[0] for v in vals])
